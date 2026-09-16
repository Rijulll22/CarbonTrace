"""
CarbonTrace AI explanation module.

Responsibilities:
- Generate human-readable explanations from already-calculated
  CarbonTrace data.
- Use exactly one LLM call per explanation request.
- Never calculate, modify, or invent carbon/emissions values.
- Provide a deterministic fallback when an LLM is unavailable.

The AI layer is explanatory only.
Carbon calculations and optimization remain deterministic backend logic.
"""

from __future__ import annotations

import os
from typing import Any


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_MODEL = os.getenv(
    "CARBONTRACE_AI_MODEL",
    "openrouter/free",
)

OPENROUTER_API_KEY_ENV = "OPENROUTER_API_KEY"

SYSTEM_PROMPT = """
You are the CarbonTrace reporting assistant.

Your job is to explain already-calculated carbon accounting and
decarbonization results in clear business language.

STRICT RULES:
1. Do not calculate or recalculate emissions.
2. Do not change any numerical value supplied in the context.
3. Do not invent missing data.
4. Do not claim regulatory certification or compliance.
5. Describe CarbonTrace as a GHG Protocol-aligned prototype.
6. Clearly distinguish primary data from estimated data when provided.
7. Explain trends, priorities, and implications using only the supplied data.
8. Keep the explanation concise and suitable for a corporate sustainability
   report.
"""


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

def build_prompt(
    context_type: str,
    context: dict[str, Any],
    question: str,
) -> str:
    """
    Build the user prompt for the single LLM explanation call.

    The supplied context is treated as authoritative calculated data.
    """

    if not context_type.strip():
        raise ValueError("context_type cannot be empty.")

    if not question.strip():
        raise ValueError("question cannot be empty.")

    context_lines = []

    for key, value in context.items():
        context_lines.append(f"- {key}: {value}")

    context_text = "\n".join(context_lines)

    return (
        f"Context type: {context_type}\n\n"
        f"Calculated CarbonTrace data:\n"
        f"{context_text}\n\n"
        f"Question:\n"
        f"{question}\n\n"
        "Provide a concise explanation based only on the information above."
    )


# ---------------------------------------------------------------------------
# Deterministic fallback
# ---------------------------------------------------------------------------

def generate_fallback_explanation(
    context_type: str,
    context: dict[str, Any],
    question: str,
) -> str:
    """
    Generate a deterministic explanation when the LLM is unavailable.

    This function deliberately does not perform calculations.
    """

    if context_type == "optimization":
        status = context.get("status", "unknown")
        target_achieved = context.get("target_achieved")

        if target_achieved is True:
            return (
                "The optimization analysis identifies a set of "
                "decarbonization actions that achieves the specified "
                "reduction target within the available optimization "
                "constraints."
            )

        if target_achieved is False:
            return (
                "The optimization analysis identifies available "
                "decarbonization actions, but the specified reduction "
                "target is not achieved under the provided constraints."
            )

        return (
            f"The optimization analysis returned the status "
            f"'{status}'. Review the available actions and constraints "
            "before making a decarbonization decision."
        )

    if context_type == "emissions":
        return (
            "The emissions data summarizes the calculated carbon footprint "
            "using the activity data and emission factors supplied to "
            "CarbonTrace. Primary and estimated data should be considered "
            "separately when interpreting the result."
        )

    if context_type == "verification":
        return (
            "The verification information describes the integrity status "
            "of the CarbonTrace data through its verification ledger. "
            "Verified and estimated records should be interpreted "
            "according to their respective data classifications."
        )

    if context_type == "report":
        return (
            "This explanation is based on the calculated CarbonTrace "
            "reporting data provided to the AI layer. The result is "
            "intended to support reporting and interpretation and does "
            "not replace statutory third-party assurance."
        )

    return (
        "CarbonTrace generated this explanation from the supplied "
        f"{context_type} data. The explanation is informational and "
        "does not alter the underlying calculated results."
    )


# ---------------------------------------------------------------------------
# LLM client
# ---------------------------------------------------------------------------

def _get_openrouter_client():
    """
    Create an OpenAI-compatible client for OpenRouter.

    Importing the SDK happens lazily so that CarbonTrace can still run
    without the optional AI dependency.
    """

    api_key = os.getenv(OPENROUTER_API_KEY_ENV)

    if not api_key:
        return None

    try:
        from openai import OpenAI
    except ImportError:
        return None

    return OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
    )


def generate_llm_explanation(
    context_type: str,
    context: dict[str, Any],
    question: str,
    model: str = DEFAULT_MODEL,
) -> str | None:
    """
    Generate one explanation using one LLM call.

    Returns:
        str: LLM explanation when successful.
        None: when the LLM is unavailable or the call fails.

    The function does not retry, chain, or perform additional LLM calls.
    """

    client = _get_openrouter_client()

    if client is None:
        return None

    prompt = build_prompt(
        context_type=context_type,
        context=context,
        question=question,
    )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT.strip(),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.2,
            max_tokens=300,
        )
    except Exception:
        return None

    try:
        content = response.choices[0].message.content
    except (AttributeError, IndexError, TypeError):
        return None

    if not content:
        return None

    explanation = str(content).strip()

    if not explanation:
        return None

    return explanation


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_explanation(
    context_type: str,
    context: dict[str, Any],
    question: str,
    model: str = DEFAULT_MODEL,
) -> dict[str, Any]:
    """
    Generate an AI explanation with deterministic fallback.

    Returns a dictionary matching the shared AI response contract:

        {
            "explanation": "...",
            "is_fallback": False
        }

    If the LLM is unavailable, `is_fallback` is True.
    """

    if not isinstance(context, dict):
        raise TypeError("context must be a dictionary.")

    if not isinstance(context_type, str):
        raise TypeError("context_type must be a string.")

    if not isinstance(question, str):
        raise TypeError("question must be a string.")

    if not context_type.strip():
        raise ValueError("context_type cannot be empty.")

    if not question.strip():
        raise ValueError("question cannot be empty.")

    explanation = generate_llm_explanation(
        context_type=context_type,
        context=context,
        question=question,
        model=model,
    )

    if explanation is not None:
        return {
            "explanation": explanation,
            "is_fallback": False,
        }

    return {
        "explanation": generate_fallback_explanation(
            context_type=context_type,
            context=context,
            question=question,
        ),
        "is_fallback": True,
    }


__all__ = [
    "DEFAULT_MODEL",
    "SYSTEM_PROMPT",
    "build_prompt",
    "generate_fallback_explanation",
    "generate_llm_explanation",
    "generate_explanation",
]