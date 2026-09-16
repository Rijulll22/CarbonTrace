"""
CarbonTrace Deterministic Carbon Calculation Engine.

Implements the core GHG Protocol-aligned emissions calculation logic:

    emissions_kgco2e = activity_quantity × emission_factor

This module is responsible ONLY for deterministic calculation and
aggregation. It does NOT:
  - save or commit database records
  - generate verification hashes
  - call blockchain or optimizer
  - call AI
  - raise HTTP exceptions

All emission factors are sourced from constants.py.
No factors are fabricated, invented, or dynamically generated here.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from constants import (
    EMISSION_FACTORS,
    FACTOR_STATUS_APPROVED,
    MAX_ACTIVITY_QUANTITY,
    MIN_ACTIVITY_QUANTITY,
    THRESHOLD_FLAG_VARIANCE,
    UNIT_KGCO2E,
)


# ============================================================
# CUSTOM EXCEPTIONS
# ============================================================

class CarbonCalculationError(Exception):
    """
    Base exception for all carbon engine errors.
    Callers (e.g. API layer) should catch this and convert to
    appropriate HTTP error responses.
    """


class UnknownActivityTypeError(CarbonCalculationError):
    """Raised when the requested activity_type is not found in EMISSION_FACTORS."""


class PendingFactorError(CarbonCalculationError):
    """
    Raised when an activity_type is registered in EMISSION_FACTORS but its
    factor value is None/pending approval.  No calculation is performed.
    """


class InvalidQuantityError(CarbonCalculationError):
    """Raised when activity_quantity is out of allowed bounds."""


class UnitMismatchError(CarbonCalculationError):
    """
    Raised when the submitted activity_unit does not match the factor's
    expected unit in EMISSION_FACTORS.  Units are not silently converted.
    """


# ============================================================
# DATACLASSES FOR INTERMEDIATE RESULTS
# ============================================================

@dataclass
class ResolvedFactor:
    """
    Resolved emission factor for an activity type.
    Returned by resolve_emission_factor() so callers have the full
    factor context for auditing.
    """
    activity_type: str
    factor: float
    unit: str
    factor_unit: str
    scope: str
    source: str
    status: str


@dataclass
class ActivityCalculationResult:
    """
    Intermediate calculation result produced by calculate_activity().
    Carries all fields needed to construct a CarbonActivity ORM record
    and the corresponding CarbonActivityResponse schema — without being
    a Pydantic model itself.
    """
    activity_type: str
    activity_quantity: float
    activity_unit: str
    emission_factor: float
    emissions_kgco2e: float
    is_primary: bool
    is_flagged: bool


@dataclass
class SummaryAggregation:
    """
    Aggregated summary data for a company, aligned with CarbonSummaryResponse.
    Fields match the schema exactly so the API layer can build the response
    without any additional computation.
    """
    company_id: int
    total_emissions_kgco2e: float
    primary_emissions_kgco2e: float
    estimated_emissions_kgco2e: float
    primary_data_percentage: float
    flagged_entries_count: int


# ============================================================
# FACTOR RESOLUTION
# ============================================================

def resolve_emission_factor(activity_type: str) -> ResolvedFactor:
    """
    Resolve the approved emission factor for an activity type from
    the centralized EMISSION_FACTORS registry in constants.py.

    Raises:
        UnknownActivityTypeError: activity_type not found in registry.
        PendingFactorError: activity_type is registered but factor is
            None or status is not FACTOR_STATUS_APPROVED.
    """
    entry = EMISSION_FACTORS.get(activity_type)
    if entry is None:
        raise UnknownActivityTypeError(
            f"Activity type '{activity_type}' is not registered in EMISSION_FACTORS. "
            f"Available types: {list(EMISSION_FACTORS.keys())}"
        )

    factor_value = entry.get("factor")
    status = entry.get("status", "")

    if factor_value is None or status != FACTOR_STATUS_APPROVED:
        source = entry.get("source", "Unknown source")
        raise PendingFactorError(
            f"Activity type '{activity_type}' has a pending or unapproved emission factor. "
            f"No calculation can be performed until an authoritative value is provided. "
            f"Source note: {source}"
        )

    return ResolvedFactor(
        activity_type=activity_type,
        factor=float(factor_value),
        unit=str(entry.get("unit", "")),
        factor_unit=str(entry.get("factor_unit", "")),
        scope=str(entry.get("scope", "")),
        source=str(entry.get("source", "")),
        status=str(status),
    )


# ============================================================
# QUANTITY VALIDATION
# ============================================================

def validate_quantity(activity_quantity: float, activity_type: str) -> None:
    """
    Validate that activity_quantity is within the allowed range defined
    in constants.py.  Does not alter the value.

    Raises:
        InvalidQuantityError: quantity is out of bounds.
    """
    if not isinstance(activity_quantity, (int, float)):
        raise InvalidQuantityError(
            f"activity_quantity must be numeric, got {type(activity_quantity).__name__}."
        )
    if activity_quantity <= MIN_ACTIVITY_QUANTITY:
        raise InvalidQuantityError(
            f"activity_quantity must be > {MIN_ACTIVITY_QUANTITY} for '{activity_type}', "
            f"got {activity_quantity}."
        )
    if activity_quantity > MAX_ACTIVITY_QUANTITY:
        raise InvalidQuantityError(
            f"activity_quantity exceeds maximum allowed value "
            f"({MAX_ACTIVITY_QUANTITY}) for '{activity_type}', got {activity_quantity}."
        )


# ============================================================
# UNIT VALIDATION
# ============================================================

def validate_unit(activity_unit: str, resolved: ResolvedFactor) -> None:
    """
    Validate that the submitted activity_unit matches the factor's expected
    unit from constants.py.  Units are NOT silently converted.

    Raises:
        UnitMismatchError: submitted unit does not match the factor's unit.
    """
    if activity_unit != resolved.unit:
        raise UnitMismatchError(
            f"Unit mismatch for '{resolved.activity_type}': "
            f"expected '{resolved.unit}', got '{activity_unit}'. "
            f"Provide the quantity in '{resolved.unit}' to match the "
            f"emission factor ({resolved.factor_unit})."
        )


# ============================================================
# CORE EMISSIONS FORMULA
# ============================================================

def compute_emissions(activity_quantity: float, emission_factor: float) -> float:
    """
    Deterministic emissions calculation.

        emissions_kgco2e = activity_quantity × emission_factor

    Returns:
        emissions_kgco2e (float) rounded to 4 decimal places.
    """
    return round(activity_quantity * emission_factor, 4)


# ============================================================
# VARIANCE / FLAGGING
# ============================================================

def compute_is_flagged(
    emissions_kgco2e: float,
    benchmark_kgco2e: Optional[float] = None,
) -> bool:
    """
    Determine whether a calculated emissions value should be flagged.

    Flagging logic (deterministic):
        If a benchmark_kgco2e is provided, variance is computed as:

            variance = abs(emissions - benchmark) / benchmark

        If variance > THRESHOLD_FLAG_VARIANCE the entry is flagged.

    If no benchmark is provided:
        Returns False (not flagged by default).

    No benchmark values currently exist in the CarbonTrace architecture,
    so the default behaviour is always not flagged until a benchmark is
    explicitly supplied by the caller (e.g. the API service layer based
    on peer data or company history).

    Args:
        emissions_kgco2e:   calculated emissions value.
        benchmark_kgco2e:   optional reference/benchmark value for variance
                            comparison.  Must be > 0 if provided.

    Returns:
        True if flagged, False otherwise.
    """
    if benchmark_kgco2e is None or benchmark_kgco2e <= 0.0:
        return False

    variance = abs(emissions_kgco2e - benchmark_kgco2e) / benchmark_kgco2e
    return variance > THRESHOLD_FLAG_VARIANCE


# ============================================================
# FULL ACTIVITY CALCULATION
# ============================================================

def calculate_activity(
    activity_type: str,
    activity_quantity: float,
    activity_unit: str,
    is_primary: bool = False,
    custom_emission_factor: Optional[float] = None,
    benchmark_kgco2e: Optional[float] = None,
) -> ActivityCalculationResult:
    """
    Calculate a complete carbon activity result.

    Workflow:
        1. Validate quantity against allowed bounds.
        2. Resolve emission factor from constants.py (or use custom factor
           if explicitly provided by caller — e.g. a primary supplier EPD
           value submitted via the API).
        3. Validate that the submitted unit matches the factor's unit.
        4. Compute emissions_kgco2e = activity_quantity × emission_factor.
        5. Determine is_flagged via optional benchmark comparison.
        6. Return ActivityCalculationResult.

    Args:
        activity_type:          Activity type key matching EMISSION_FACTORS.
        activity_quantity:      Numeric quantity of the activity.
        activity_unit:          Unit of the quantity (must match factor unit
                                unless custom_emission_factor is provided).
        is_primary:             True = primary measured data; False = estimated.
        custom_emission_factor: Optional caller-supplied factor (e.g. from a
                                supplier-provided EPD).  When supplied, skips
                                the EMISSION_FACTORS registry lookup.  The
                                submitted activity_unit is still stored but
                                unit-vs-registry validation is relaxed since
                                the caller is supplying their own factor.
        benchmark_kgco2e:       Optional benchmark for variance flagging.

    Returns:
        ActivityCalculationResult with all fields populated.

    Raises:
        InvalidQuantityError:   Quantity out of bounds.
        UnknownActivityTypeError: Activity type not in registry.
        PendingFactorError:     Registry factor is None/pending approval.
        UnitMismatchError:      Submitted unit does not match factor unit
                                (only when no custom_emission_factor given).
    """
    validate_quantity(activity_quantity, activity_type)

    if custom_emission_factor is not None:
        # Caller-supplied factor — use as-is without registry lookup.
        # activity_type still must exist in EMISSION_FACTORS so the data
        # remains traceable to a known activity category.
        if activity_type not in EMISSION_FACTORS:
            raise UnknownActivityTypeError(
                f"Activity type '{activity_type}' is not registered in EMISSION_FACTORS. "
                f"Available types: {list(EMISSION_FACTORS.keys())}"
            )
        factor_value = float(custom_emission_factor)
    else:
        resolved = resolve_emission_factor(activity_type)
        validate_unit(activity_unit, resolved)
        factor_value = resolved.factor

    emissions = compute_emissions(activity_quantity, factor_value)
    flagged = compute_is_flagged(emissions, benchmark_kgco2e)

    return ActivityCalculationResult(
        activity_type=activity_type,
        activity_quantity=activity_quantity,
        activity_unit=activity_unit,
        emission_factor=factor_value,
        emissions_kgco2e=emissions,
        is_primary=is_primary,
        is_flagged=flagged,
    )


# ============================================================
# AGGREGATION
# ============================================================

def aggregate_company_summary(
    company_id: int,
    activities: list,
) -> SummaryAggregation:
    """
    Aggregate a list of CarbonActivity ORM objects (or any objects with
    the same field names) into a SummaryAggregation aligned with
    CarbonSummaryResponse.

    Expected fields on each activity object:
        - emissions_kgco2e: float
        - is_primary:       bool
        - is_flagged:       bool

    Args:
        company_id:  The company ID for the summary.
        activities:  Iterable of CarbonActivity ORM instances (or dicts
                     with equivalent fields).

    Returns:
        SummaryAggregation ready to be unpacked into CarbonSummaryResponse.
    """
    total = 0.0
    primary = 0.0
    estimated = 0.0
    flagged_count = 0
    total_entries = 0

    for act in activities:
        # Support both ORM objects (attribute access) and plain dicts
        if isinstance(act, dict):
            emissions = float(act.get("emissions_kgco2e", 0.0))
            is_prim = bool(act.get("is_primary", False))
            is_flag = bool(act.get("is_flagged", False))
        else:
            emissions = float(getattr(act, "emissions_kgco2e", 0.0))
            is_prim = bool(getattr(act, "is_primary", False))
            is_flag = bool(getattr(act, "is_flagged", False))

        total += emissions
        if is_prim:
            primary += emissions
        else:
            estimated += emissions
        if is_flag:
            flagged_count += 1
        total_entries += 1

    if total_entries > 0:
        prim_pct = round((primary / total * 100.0) if total > 0.0 else 0.0, 2)
    else:
        prim_pct = 0.0

    return SummaryAggregation(
        company_id=company_id,
        total_emissions_kgco2e=round(total, 4),
        primary_emissions_kgco2e=round(primary, 4),
        estimated_emissions_kgco2e=round(estimated, 4),
        primary_data_percentage=prim_pct,
        flagged_entries_count=flagged_count,
    )


# ============================================================
# FACTOR INTROSPECTION (helper for API / seed layers)
# ============================================================

def list_available_activity_types() -> list[dict]:
    """
    Return metadata for all registered activity types including their
    approval status.  Useful for API endpoints and seed data validation.
    Pending/unapproved types are included but marked clearly.
    """
    result = []
    for key, entry in EMISSION_FACTORS.items():
        result.append({
            "activity_type": key,
            "unit": entry.get("unit"),
            "factor": entry.get("factor"),
            "factor_unit": entry.get("factor_unit"),
            "scope": entry.get("scope"),
            "source": entry.get("source"),
            "status": entry.get("status"),
            "is_usable": (
                entry.get("factor") is not None
                and entry.get("status") == FACTOR_STATUS_APPROVED
            ),
        })
    return result
