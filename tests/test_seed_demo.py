"""
Tests for CarbonTrace seed_demo.py.

These tests validate the deterministic demo dataset without requiring
the database layer or verification.py implementation.
"""

import pytest

from seed_demo import (
    DEMO_ACTIVITIES,
    DEMO_COMPANY,
    DEMO_INTERVENTIONS,
    DEMO_SUPPLIERS,
    build_verification_payload,
    build_verification_record,
    calculate_demo_emissions,
    get_demo_activities,
    get_demo_dataset,
    get_demo_emission_summary,
    get_demo_interventions,
    get_demo_supplier_emissions,
    get_demo_suppliers,
)


# ---------------------------------------------------------------------------
# Company
# ---------------------------------------------------------------------------

def test_demo_company_is_defined():
    company = get_demo_dataset()["company"]

    assert company["id"] == 1
    assert company["name"] == "ABC Manufacturing"
    assert company["reporting_period"] == "FY2025-26"


def test_demo_company_returns_copy():
    company = get_demo_company_copy()

    company["name"] = "Modified Company"

    assert DEMO_COMPANY["name"] == "ABC Manufacturing"


def get_demo_company_copy():
    from seed_demo import get_demo_company

    return get_demo_company()


# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------

def test_demo_activities_are_present():
    activities = get_demo_activities()

    assert len(activities) == len(DEMO_ACTIVITIES)
    assert len(activities) > 0


def test_demo_activity_fields_are_valid():
    for activity in DEMO_ACTIVITIES:
        assert activity.activity_key
        assert activity.activity_type
        assert activity.category

        assert activity.quantity > 0
        assert activity.unit

        assert activity.emission_factor >= 0
        assert activity.emission_factor_unit

        assert activity.scope in {1, 2, 3}
        assert activity.source

        assert isinstance(activity.is_primary, bool)


def test_demo_activities_have_unique_keys():
    keys = [activity.activity_key for activity in DEMO_ACTIVITIES]

    assert len(keys) == len(set(keys))


def test_demo_activities_have_primary_and_estimated_data():
    primary_count = sum(
        activity.is_primary
        for activity in DEMO_ACTIVITIES
    )

    estimated_count = sum(
        not activity.is_primary
        for activity in DEMO_ACTIVITIES
    )

    assert primary_count > 0
    assert estimated_count > 0


def test_demo_activity_records_do_not_have_database_ids():
    activities = get_demo_activities()

    for activity in activities:
        assert "id" not in activity
        assert "entry_id" not in activity


# ---------------------------------------------------------------------------
# Deterministic emission calculation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "quantity, emission_factor, expected",
    [
        (100, 0.5, 50),
        (1000, 0.72, 720),
        (500, 0.20, 100),
        (25_000, 0.14, 3500),
    ],
)
def test_calculate_demo_emissions(
    quantity,
    emission_factor,
    expected,
):
    from seed_demo import DemoActivity

    activity = DemoActivity(
        activity_key="test",
        activity_type="test",
        category="Test",
        quantity=quantity,
        unit="unit",
        emission_factor=emission_factor,
        emission_factor_unit="kgCO2e/unit",
        scope=1,
        source="test",
        is_primary=True,
    )

    assert calculate_demo_emissions(activity) == pytest.approx(expected)


def test_all_demo_emissions_are_deterministic():
    first = [
        calculate_demo_emissions(activity)
        for activity in DEMO_ACTIVITIES
    ]

    second = [
        calculate_demo_emissions(activity)
        for activity in DEMO_ACTIVITIES
    ]

    assert first == second


# ---------------------------------------------------------------------------
# Emission summary
# ---------------------------------------------------------------------------

def test_demo_emission_summary_contains_all_scopes():
    summary = get_demo_emission_summary()

    assert "scope_1_kgco2e" in summary
    assert "scope_2_kgco2e" in summary
    assert "scope_3_kgco2e" in summary
    assert "total_emissions_kgco2e" in summary


def test_demo_emission_summary_has_positive_values():
    summary = get_demo_emission_summary()

    assert summary["scope_1_kgco2e"] > 0
    assert summary["scope_2_kgco2e"] > 0
    assert summary["scope_3_kgco2e"] > 0
    assert summary["total_emissions_kgco2e"] > 0


def test_total_emissions_equal_scope_sum():
    summary = get_demo_emission_summary()

    scope_sum = (
        summary["scope_1_kgco2e"]
        + summary["scope_2_kgco2e"]
        + summary["scope_3_kgco2e"]
    )

    assert summary["total_emissions_kgco2e"] == pytest.approx(scope_sum)


def test_emission_summary_matches_activity_calculations():
    expected_scope_totals = {
        1: 0.0,
        2: 0.0,
        3: 0.0,
    }

    for activity in DEMO_ACTIVITIES:
        expected_scope_totals[activity.scope] += (
            calculate_demo_emissions(activity)
        )

    summary = get_demo_emission_summary()

    assert summary["scope_1_kgco2e"] == pytest.approx(
        expected_scope_totals[1]
    )

    assert summary["scope_2_kgco2e"] == pytest.approx(
        expected_scope_totals[2]
    )

    assert summary["scope_3_kgco2e"] == pytest.approx(
        expected_scope_totals[3]
    )


# ---------------------------------------------------------------------------
# Suppliers
# ---------------------------------------------------------------------------

def test_demo_suppliers_are_present():
    suppliers = get_demo_suppliers()

    assert len(suppliers) == len(DEMO_SUPPLIERS)
    assert len(suppliers) > 0


def test_demo_suppliers_belong_to_demo_company():
    suppliers = get_demo_suppliers()

    for supplier in suppliers:
        assert supplier["company_id"] == DEMO_COMPANY["id"]


def test_demo_supplier_ids_are_unique():
    suppliers = get_demo_suppliers()

    ids = [supplier["id"] for supplier in suppliers]

    assert len(ids) == len(set(ids))


def test_demo_suppliers_have_verification_mix():
    suppliers = get_demo_suppliers()

    verified_count = sum(
        supplier["is_verified"]
        for supplier in suppliers
    )

    unverified_count = sum(
        not supplier["is_verified"]
        for supplier in suppliers
    )

    assert verified_count > 0
    assert unverified_count > 0


# ---------------------------------------------------------------------------
# Supplier emissions
# ---------------------------------------------------------------------------

def test_demo_supplier_emissions_are_present():
    records = get_demo_supplier_emissions()

    assert len(records) > 0


def test_supplier_emissions_are_positive():
    records = get_demo_supplier_emissions()

    for record in records:
        assert record["supplier_id"] > 0
        assert record["emissions_kgco2e"] > 0
        assert record["activity"]


def test_supplier_emissions_have_primary_and_estimated_data():
    records = get_demo_supplier_emissions()

    primary_count = sum(
        record["is_primary"]
        for record in records
    )

    estimated_count = sum(
        not record["is_primary"]
        for record in records
    )

    assert primary_count > 0
    assert estimated_count > 0


# ---------------------------------------------------------------------------
# Optimizer interventions
# ---------------------------------------------------------------------------

def test_demo_interventions_are_present():
    interventions = get_demo_interventions()

    assert len(interventions) == len(DEMO_INTERVENTIONS)
    assert len(interventions) > 0


def test_demo_interventions_have_valid_values():
    interventions = get_demo_interventions()

    for intervention in interventions:
        assert intervention["action"]

        assert intervention[
            "estimated_reduction_kgco2e"
        ] > 0

        assert intervention[
            "estimated_cost_inr"
        ] >= 0

        assert intervention["priority"] > 0


def test_demo_intervention_actions_are_unique():
    interventions = get_demo_interventions()

    actions = [
        intervention["action"]
        for intervention in interventions
    ]

    assert len(actions) == len(set(actions))


# ---------------------------------------------------------------------------
# Verification payload
# ---------------------------------------------------------------------------

def test_verification_payload_contains_activity_data():
    activity = DEMO_ACTIVITIES[0]

    payload = build_verification_payload(activity)

    assert payload["activity_key"] == activity.activity_key
    assert payload["activity_type"] == activity.activity_type
    assert payload["quantity"] == activity.quantity
    assert payload["unit"] == activity.unit
    assert payload["emission_factor"] == activity.emission_factor
    assert payload["scope"] == activity.scope
    assert payload["is_primary"] == activity.is_primary


def test_verification_payload_is_deterministic():
    activity = DEMO_ACTIVITIES[0]

    first = build_verification_payload(activity)
    second = build_verification_payload(activity)

    assert first == second


def test_verification_record_uses_real_activity_id():
    activity = DEMO_ACTIVITIES[0]

    record = build_verification_record(
        activity=activity,
        activity_id=42,
    )

    assert record["source_id"] == 42
    assert record["entry_type"] == (
        f"seed_demo_{activity.activity_key}"
    )


def test_verification_record_contains_company_id():
    activity = DEMO_ACTIVITIES[0]

    record = build_verification_record(
        activity=activity,
        activity_id=42,
    )

    assert record["metadata"]["company_id"] == DEMO_COMPANY["id"]


def test_verification_record_preserves_primary_flag():
    for activity in DEMO_ACTIVITIES:
        record = build_verification_record(
            activity=activity,
            activity_id=100,
        )

        assert record["is_primary"] == activity.is_primary


def test_verification_record_does_not_implement_hashing():
    activity = DEMO_ACTIVITIES[0]

    record = build_verification_record(
        activity=activity,
        activity_id=42,
    )

    assert "data_hash" not in record
    assert "block_hash" not in record
    assert "previous_hash" not in record


# ---------------------------------------------------------------------------
# Complete dataset
# ---------------------------------------------------------------------------

def test_complete_demo_dataset_contains_expected_sections():
    dataset = get_demo_dataset()

    assert "company" in dataset
    assert "activities" in dataset
    assert "suppliers" in dataset
    assert "supplier_emissions" in dataset
    assert "interventions" in dataset
    assert "emission_summary" in dataset


def test_complete_demo_dataset_is_deterministic():
    first = get_demo_dataset()
    second = get_demo_dataset()

    assert first == second


def test_getters_return_independent_data():
    activities = get_demo_activities()
    suppliers = get_demo_suppliers()
    supplier_emissions = get_demo_supplier_emissions()
    interventions = get_demo_interventions()

    activities[0]["quantity"] = 999999
    suppliers[0]["name"] = "Modified"
    supplier_emissions[0]["emissions_kgco2e"] = 999999
    interventions[0]["priority"] = 999

    fresh_activities = get_demo_activities()
    fresh_suppliers = get_demo_suppliers()
    fresh_supplier_emissions = get_demo_supplier_emissions()
    fresh_interventions = get_demo_interventions()

    assert fresh_activities[0]["quantity"] != 999999
    assert fresh_suppliers[0]["name"] != "Modified"
    assert (
        fresh_supplier_emissions[0]["emissions_kgco2e"]
        != 999999
    )
    assert fresh_interventions[0]["priority"] != 999


# ---------------------------------------------------------------------------
# Expected demo numbers
# ---------------------------------------------------------------------------

def test_expected_demo_emission_values():
    summary = get_demo_emission_summary()

    # Scope 1:
    # Diesel = 30,000 × 2.68 = 80,400
    # Natural gas = 20,000 × 2.02 = 40,400
    # Total = 120,800 kgCO2e
    assert summary["scope_1_kgco2e"] == pytest.approx(120_800)

    # Scope 2:
    # Electricity = 100,000 × 0.72 = 72,000 kgCO2e
    assert summary["scope_2_kgco2e"] == pytest.approx(72_000)

    # Scope 3:
    # Freight = 500 × 0.20 = 100
    # Supplier electricity = 40,000 × 0.72 = 28,800
    # Business travel = 25,000 × 0.14 = 3,500
    # Total = 32,400 kgCO2e
    assert summary["scope_3_kgco2e"] == pytest.approx(32_400)

    assert summary["total_emissions_kgco2e"] == pytest.approx(225_200)