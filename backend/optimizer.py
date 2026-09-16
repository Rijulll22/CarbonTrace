"""
CarbonTrace - Optimization Engine

Person 3 owns this module.

Responsibilities:
- Select carbon-reduction interventions under a budget.
- Maximize expected emissions reduction.
- Calculate target emissions.
- Calculate required reduction.
- Calculate projected/residual emissions.
- Determine whether the reduction target is achieved.
- Return recommendations compatible with schemas.py.

Important architectural rules:
- This module does NOT calculate emission factors.
- Emissions must already be calculated by carbon.py.
- This module does NOT access the database directly yet.
- This module does NOT use an LLM.
- AI explanations belong to ai.py.

The optimization engine is intentionally independent of SQLAlchemy models.
Person 1's database/carbon-engine implementation can be connected later.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import pulp

from constants import (
    MAX_REDUCTION_PERCENTAGE,
    MIN_BUDGET_INR,
    MIN_REDUCTION_PERCENTAGE,
)


# ============================================================
# INTERNAL DATA MODEL
# ============================================================


@dataclass(frozen=True)
class Intervention:
    """
    Internal representation of a possible carbon-reduction action.

    This is intentionally independent of SQLAlchemy models so that
    the optimization engine can operate on already-calculated
    intervention data.

    All reduction values must already be calculated in kgCO2e.
    """

    action: str
    estimated_reduction_kgco2e: float
    estimated_cost_inr: float
    priority: int = 1

    # Optional metadata for future integration.
    category: Optional[str] = None
    target_scope: Optional[str] = None
    target_source: Optional[str] = None
    supplier_id: Optional[int] = None


# ============================================================
# VALIDATION
# ============================================================


def _validate_intervention(
    intervention: Intervention,
) -> None:
    """Validate an individual intervention."""

    if not intervention.action.strip():
        raise ValueError(
            "Intervention action cannot be empty."
        )

    if intervention.estimated_reduction_kgco2e < 0:
        raise ValueError(
            f"Reduction cannot be negative for "
            f"'{intervention.action}'."
        )

    if intervention.estimated_cost_inr < 0:
        raise ValueError(
            f"Cost cannot be negative for "
            f"'{intervention.action}'."
        )

    if intervention.priority < 1:
        raise ValueError(
            f"Priority must be >= 1 for "
            f"'{intervention.action}'."
        )


def _validate_inputs(
    current_emissions_kgco2e: float,
    target_reduction_percentage: float,
    budget_inr: Optional[float],
    interventions: list[Intervention],
) -> None:
    """Validate optimizer inputs."""

    if current_emissions_kgco2e < 0:
        raise ValueError(
            "Current emissions cannot be negative."
        )

    if not (
        MIN_REDUCTION_PERCENTAGE
        <= target_reduction_percentage
        <= MAX_REDUCTION_PERCENTAGE
    ):
        raise ValueError(
            "Target reduction percentage must be "
            f"between {MIN_REDUCTION_PERCENTAGE} and "
            f"{MAX_REDUCTION_PERCENTAGE}."
        )

    if budget_inr is not None and budget_inr < MIN_BUDGET_INR:
        raise ValueError(
            "Budget cannot be negative."
        )

    seen_actions: set[str] = set()

    for intervention in interventions:
        _validate_intervention(intervention)

        normalized_action = (
            intervention.action.strip().lower()
        )

        if normalized_action in seen_actions:
            raise ValueError(
                f"Duplicate intervention action: "
                f"'{intervention.action}'."
            )

        seen_actions.add(normalized_action)


# ============================================================
# TARGET CALCULATION
# ============================================================


def calculate_target_emissions(
    current_emissions_kgco2e: float,
    target_reduction_percentage: float,
) -> float:
    """
    Calculate the target emissions after the requested
    percentage reduction.

    Example:

        Current emissions = 100,000 kgCO2e
        Reduction target  = 15%

        Target emissions = 85,000 kgCO2e
    """

    if current_emissions_kgco2e < 0:
        raise ValueError(
            "Current emissions cannot be negative."
        )

    if not (
        MIN_REDUCTION_PERCENTAGE
        <= target_reduction_percentage
        <= MAX_REDUCTION_PERCENTAGE
    ):
        raise ValueError(
            "Target reduction percentage must be "
            f"between {MIN_REDUCTION_PERCENTAGE} and "
            f"{MAX_REDUCTION_PERCENTAGE}."
        )

    reduction_fraction = (
        target_reduction_percentage / 100.0
    )

    target_emissions = (
        current_emissions_kgco2e
        * (1.0 - reduction_fraction)
    )

    return max(
        0.0,
        target_emissions,
    )


def calculate_required_reduction(
    current_emissions_kgco2e: float,
    target_reduction_percentage: float,
) -> float:
    """
    Calculate the absolute amount of emissions that need
    to be reduced.

    This function does not calculate emissions itself.
    It only derives the requested reduction from the
    already-computed carbon footprint.
    """

    target_emissions = calculate_target_emissions(
        current_emissions_kgco2e,
        target_reduction_percentage,
    )

    return max(
        0.0,
        current_emissions_kgco2e
        - target_emissions,
    )


# ============================================================
# INTERVENTION PREPARATION
# ============================================================


def _usable_interventions(
    interventions: list[Intervention],
) -> list[Intervention]:
    """
    Remove interventions that cannot contribute to
    emissions reduction.

    Zero-reduction interventions are ignored because selecting
    them cannot improve the optimization objective.
    """

    return [
        intervention
        for intervention in interventions
        if intervention.estimated_reduction_kgco2e > 0
    ]


# ============================================================
# OPTIMIZATION
# ============================================================


def optimize_decarbonization(
    current_emissions_kgco2e: float,
    target_reduction_percentage: float,
    budget_inr: Optional[float],
    interventions: list[Intervention],
) -> dict:
    """
    Optimize carbon-reduction interventions.

    Objective:
        Maximize total expected emissions reduction.

    Decision variable:
        x_i = 1 if intervention i is selected
        x_i = 0 otherwise

    Budget constraint:
        sum(cost_i * x_i) <= budget

    If budget_inr is None:
        there is no financial constraint and all usable
        interventions are eligible for selection.

    The reduction target is evaluated after solving:
        target_achieved =
            optimized_reduction >= required_reduction

    Returns an internal dictionary rather than a Pydantic
    response so that the API layer can later convert this
    into schemas.OptimizationResponse.
    """

    _validate_inputs(
        current_emissions_kgco2e=current_emissions_kgco2e,
        target_reduction_percentage=target_reduction_percentage,
        budget_inr=budget_inr,
        interventions=interventions,
    )

    target_emissions = calculate_target_emissions(
        current_emissions_kgco2e,
        target_reduction_percentage,
    )

    required_reduction = calculate_required_reduction(
        current_emissions_kgco2e,
        target_reduction_percentage,
    )

    usable_interventions = _usable_interventions(
        interventions
    )

    # --------------------------------------------------------
    # No reduction required
    # --------------------------------------------------------

    if required_reduction == 0:
        return {
            "status": "target_already_met",
            "current_emissions_kgco2e": round(
                current_emissions_kgco2e,
                2,
            ),
            "target_emissions_kgco2e": round(
                target_emissions,
                2,
            ),
            "required_reduction_kgco2e": 0.0,
            "optimized_reduction_kgco2e": 0.0,
            "projected_emissions_kgco2e": round(
                current_emissions_kgco2e,
                2,
            ),
            "residual_emissions_kgco2e": round(
                current_emissions_kgco2e,
                2,
            ),
            "budget_inr": budget_inr,
            "budget_used_inr": 0.0,
            "remaining_budget_inr": budget_inr,
            "target_achieved": True,
            "recommendations": [],
        }

    # --------------------------------------------------------
    # No interventions
    # --------------------------------------------------------

    if not usable_interventions:
        return {
            "status": "no_interventions_available",
            "current_emissions_kgco2e": round(
                current_emissions_kgco2e,
                2,
            ),
            "target_emissions_kgco2e": round(
                target_emissions,
                2,
            ),
            "required_reduction_kgco2e": round(
                required_reduction,
                2,
            ),
            "optimized_reduction_kgco2e": 0.0,
            "projected_emissions_kgco2e": round(
                current_emissions_kgco2e,
                2,
            ),
            "residual_emissions_kgco2e": round(
                current_emissions_kgco2e,
                2,
            ),
            "budget_inr": budget_inr,
            "budget_used_inr": 0.0,
            "remaining_budget_inr": budget_inr,
            "target_achieved": False,
            "recommendations": [],
        }

    # --------------------------------------------------------
    # Create MILP problem
    # --------------------------------------------------------

    problem = pulp.LpProblem(
        "CarbonTrace_Decarbonization_Optimization",
        pulp.LpMaximize,
    )

    # --------------------------------------------------------
    # Decision variables
    # --------------------------------------------------------

    decision_variables: dict[str, pulp.LpVariable] = {}

    for index, intervention in enumerate(
        usable_interventions
    ):
        variable_name = (
            f"select_intervention_{index}"
        )

        decision_variables[
            intervention.action
        ] = pulp.LpVariable(
            variable_name,
            cat=pulp.LpBinary,
        )

    # --------------------------------------------------------
    # Objective
    # --------------------------------------------------------

    problem += pulp.lpSum(
        intervention.estimated_reduction_kgco2e
        * decision_variables[intervention.action]
        for intervention in usable_interventions
    )

    # --------------------------------------------------------
    # Budget constraint
    # --------------------------------------------------------

    if budget_inr is not None:
        problem += (
            pulp.lpSum(
                intervention.estimated_cost_inr
                * decision_variables[
                    intervention.action
                ]
                for intervention in usable_interventions
            )
            <= budget_inr
        ), "budget_constraint"

    # --------------------------------------------------------
    # Solve
    # --------------------------------------------------------

    solver = pulp.PULP_CBC_CMD(
        msg=False,
    )

    problem.solve(solver)

    solver_status = pulp.LpStatus[
        problem.status
    ]

    if solver_status != "Optimal":
        return {
            "status": solver_status.lower(),
            "current_emissions_kgco2e": round(
                current_emissions_kgco2e,
                2,
            ),
            "target_emissions_kgco2e": round(
                target_emissions,
                2,
            ),
            "required_reduction_kgco2e": round(
                required_reduction,
                2,
            ),
            "optimized_reduction_kgco2e": 0.0,
            "projected_emissions_kgco2e": round(
                current_emissions_kgco2e,
                2,
            ),
            "residual_emissions_kgco2e": round(
                current_emissions_kgco2e,
                2,
            ),
            "budget_inr": budget_inr,
            "budget_used_inr": 0.0,
            "remaining_budget_inr": budget_inr,
            "target_achieved": False,
            "recommendations": [],
        }

    # --------------------------------------------------------
    # Extract solution
    # --------------------------------------------------------

    recommendations = []

    optimized_reduction = 0.0
    budget_used = 0.0

    for intervention in usable_interventions:
        variable = decision_variables[
            intervention.action
        ]

        selected_value = variable.value()

        if (
            selected_value is not None
            and selected_value > 0.5
        ):
            optimized_reduction += (
                intervention.estimated_reduction_kgco2e
            )

            budget_used += (
                intervention.estimated_cost_inr
            )

            recommendations.append(
                {
                    "action": intervention.action,
                    "estimated_reduction_kgco2e": round(
                        intervention.estimated_reduction_kgco2e,
                        2,
                    ),
                    "estimated_cost_inr": round(
                        intervention.estimated_cost_inr,
                        2,
                    ),
                    "priority": intervention.priority,
                }
            )

    # --------------------------------------------------------
    # Calculate final state
    # --------------------------------------------------------

    projected_emissions = max(
        0.0,
        current_emissions_kgco2e
        - optimized_reduction,
    )

    residual_emissions = projected_emissions

    target_achieved = (
        optimized_reduction
        >= required_reduction - 1e-6
    )

    remaining_budget = (
        None
        if budget_inr is None
        else max(
            0.0,
            budget_inr - budget_used,
        )
    )

    # Highest reduction first.
    recommendations.sort(
        key=lambda recommendation: (
            recommendation[
                "estimated_reduction_kgco2e"
            ],
            -recommendation["priority"],
        ),
        reverse=True,
    )

    return {
        "status": "optimal",
        "current_emissions_kgco2e": round(
            current_emissions_kgco2e,
            2,
        ),
        "target_emissions_kgco2e": round(
            target_emissions,
            2,
        ),
        "required_reduction_kgco2e": round(
            required_reduction,
            2,
        ),
        "optimized_reduction_kgco2e": round(
            optimized_reduction,
            2,
        ),
        "projected_emissions_kgco2e": round(
            projected_emissions,
            2,
        ),
        "residual_emissions_kgco2e": round(
            residual_emissions,
            2,
        ),
        "budget_inr": budget_inr,
        "budget_used_inr": round(
            budget_used,
            2,
        ),
        "remaining_budget_inr": (
            round(
                remaining_budget,
                2,
            )
            if remaining_budget is not None
            else None
        ),
        "target_achieved": target_achieved,
        "recommendations": recommendations,
    }