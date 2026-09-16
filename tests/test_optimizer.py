"""
Tests for the CarbonTrace optimization engine.

All test-only data and test logic belongs here.
Production code remains in backend/optimizer.py.
"""

import pytest

from optimizer import (
    Intervention,
    calculate_required_reduction,
    calculate_target_emissions,
    optimize_decarbonization,
)


# ============================================================
# TEST DATA
# ============================================================


def get_test_interventions() -> list[Intervention]:
    """
    Deterministic test dataset.

    This is intentionally separate from seed_demo.py.
    It exists only to test optimizer behavior independently
    of the database layer.
    """

    return [
        Intervention(
            action="Solar Power Purchase",
            estimated_reduction_kgco2e=4000,
            estimated_cost_inr=800000,
            priority=1,
        ),
        Intervention(
            action="Fleet Electrification",
            estimated_reduction_kgco2e=7000,
            estimated_cost_inr=1200000,
            priority=1,
        ),
        Intervention(
            action="Freight Route Optimization",
            estimated_reduction_kgco2e=2500,
            estimated_cost_inr=300000,
            priority=2,
        ),
        Intervention(
            action="Supplier Renewable Electricity",
            estimated_reduction_kgco2e=3500,
            estimated_cost_inr=500000,
            priority=1,
        ),
        Intervention(
            action="Material Efficiency Program",
            estimated_reduction_kgco2e=2800,
            estimated_cost_inr=450000,
            priority=2,
        ),
    ]


# ============================================================
# TARGET CALCULATION TESTS
# ============================================================


def test_target_calculation():
    target = calculate_target_emissions(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
    )

    assert target == 85000.0


def test_required_reduction_calculation():
    required = calculate_required_reduction(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
    )

    assert required == 15000.0


def test_full_reduction_target_results_in_zero_target_emissions():
    target = calculate_target_emissions(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=100,
    )

    assert target == 0.0


def test_zero_reduction_target_keeps_current_emissions():
    target = calculate_target_emissions(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=0,
    )

    assert target == 100000.0


# ============================================================
# NORMAL OPTIMIZATION TESTS
# ============================================================


def test_normal_budget_optimization():
    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
        budget_inr=1500000,
        interventions=get_test_interventions(),
    )

    assert result["status"] == "optimal"
    assert result["budget_used_inr"] <= 1500000
    assert result["optimized_reduction_kgco2e"] >= 0
    assert result["projected_emissions_kgco2e"] <= 100000


def test_optimizer_maximizes_reduction_under_budget():
    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
        budget_inr=1500000,
        interventions=get_test_interventions(),
    )

    assert result["optimized_reduction_kgco2e"] == 9500.0
    assert result["budget_used_inr"] == 1500000.0


def test_budget_constraint_is_respected():
    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
        budget_inr=300000,
        interventions=get_test_interventions(),
    )

    assert result["budget_used_inr"] <= 300000


def test_zero_budget_selects_no_interventions():
    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
        budget_inr=0,
        interventions=get_test_interventions(),
    )

    assert result["optimized_reduction_kgco2e"] == 0
    assert result["budget_used_inr"] == 0
    assert len(result["recommendations"]) == 0
    assert result["target_achieved"] is False


def test_unlimited_budget_selects_all_usable_interventions():
    interventions = get_test_interventions()

    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
        budget_inr=None,
        interventions=interventions,
    )

    expected_reduction = sum(
        intervention.estimated_reduction_kgco2e
        for intervention in interventions
    )

    expected_cost = sum(
        intervention.estimated_cost_inr
        for intervention in interventions
    )

    assert result["optimized_reduction_kgco2e"] == expected_reduction
    assert result["budget_used_inr"] == expected_cost


# ============================================================
# TARGET ACHIEVEMENT TESTS
# ============================================================


def test_target_achieved_when_required_reduction_is_met():
    interventions = [
        Intervention(
            action="Solar",
            estimated_reduction_kgco2e=20000,
            estimated_cost_inr=500000,
        )
    ]

    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
        budget_inr=500000,
        interventions=interventions,
    )

    assert result["target_achieved"] is True
    assert result["optimized_reduction_kgco2e"] == 20000
    assert result["projected_emissions_kgco2e"] == 80000


def test_target_not_achieved_when_budget_is_insufficient():
    interventions = [
        Intervention(
            action="Solar",
            estimated_reduction_kgco2e=10000,
            estimated_cost_inr=1000000,
        )
    ]

    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=20,
        budget_inr=1000000,
        interventions=interventions,
    )

    assert result["target_achieved"] is False
    assert result["optimized_reduction_kgco2e"] == 10000
    assert result["projected_emissions_kgco2e"] == 90000


def test_target_already_met_when_reduction_target_is_zero():
    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=0,
        budget_inr=1000000,
        interventions=get_test_interventions(),
    )

    assert result["status"] == "target_already_met"
    assert result["optimized_reduction_kgco2e"] == 0
    assert result["target_achieved"] is True


# ============================================================
# RESIDUAL EMISSIONS TESTS
# ============================================================


def test_residual_emissions_are_current_minus_abatement():
    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
        budget_inr=1500000,
        interventions=get_test_interventions(),
    )

    expected_residual = (
        100000
        - result["optimized_reduction_kgco2e"]
    )

    assert result["residual_emissions_kgco2e"] == expected_residual
    assert result["projected_emissions_kgco2e"] == expected_residual


def test_residual_emissions_never_go_below_zero():
    interventions = [
        Intervention(
            action="Large Abatement",
            estimated_reduction_kgco2e=200000,
            estimated_cost_inr=100000,
        )
    ]

    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=100,
        budget_inr=100000,
        interventions=interventions,
    )

    assert result["residual_emissions_kgco2e"] == 0.0
    assert result["projected_emissions_kgco2e"] == 0.0


# ============================================================
# EDGE CASE TESTS
# ============================================================


def test_no_interventions():
    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
        budget_inr=1000000,
        interventions=[],
    )

    assert result["status"] == "no_interventions_available"
    assert result["optimized_reduction_kgco2e"] == 0
    assert result["target_achieved"] is False
    assert result["residual_emissions_kgco2e"] == 100000


def test_zero_reduction_interventions_are_ignored():
    interventions = [
        Intervention(
            action="No Impact Action",
            estimated_reduction_kgco2e=0,
            estimated_cost_inr=100000,
        ),
        Intervention(
            action="Useful Action",
            estimated_reduction_kgco2e=5000,
            estimated_cost_inr=100000,
        ),
    ]

    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=5,
        budget_inr=100000,
        interventions=interventions,
    )

    assert result["optimized_reduction_kgco2e"] == 5000

    actions = [
        recommendation["action"]
        for recommendation in result["recommendations"]
    ]

    assert "No Impact Action" not in actions
    assert "Useful Action" in actions


# ============================================================
# VALIDATION TESTS
# ============================================================


def test_negative_emissions_are_rejected():
    with pytest.raises(ValueError):
        optimize_decarbonization(
            current_emissions_kgco2e=-100,
            target_reduction_percentage=15,
            budget_inr=1000000,
            interventions=get_test_interventions(),
        )


def test_reduction_percentage_above_100_is_rejected():
    with pytest.raises(ValueError):
        optimize_decarbonization(
            current_emissions_kgco2e=100000,
            target_reduction_percentage=101,
            budget_inr=1000000,
            interventions=get_test_interventions(),
        )


def test_negative_reduction_percentage_is_rejected():
    with pytest.raises(ValueError):
        optimize_decarbonization(
            current_emissions_kgco2e=100000,
            target_reduction_percentage=-1,
            budget_inr=1000000,
            interventions=get_test_interventions(),
        )


def test_negative_budget_is_rejected():
    with pytest.raises(ValueError):
        optimize_decarbonization(
            current_emissions_kgco2e=100000,
            target_reduction_percentage=15,
            budget_inr=-1,
            interventions=get_test_interventions(),
        )


def test_negative_intervention_cost_is_rejected():
    bad_interventions = [
        Intervention(
            action="Invalid Action",
            estimated_reduction_kgco2e=1000,
            estimated_cost_inr=-500,
        )
    ]

    with pytest.raises(ValueError):
        optimize_decarbonization(
            current_emissions_kgco2e=100000,
            target_reduction_percentage=15,
            budget_inr=1000000,
            interventions=bad_interventions,
        )


def test_negative_intervention_reduction_is_rejected():
    bad_interventions = [
        Intervention(
            action="Invalid Action",
            estimated_reduction_kgco2e=-1000,
            estimated_cost_inr=500,
        )
    ]

    with pytest.raises(ValueError):
        optimize_decarbonization(
            current_emissions_kgco2e=100000,
            target_reduction_percentage=15,
            budget_inr=1000000,
            interventions=bad_interventions,
        )


def test_empty_intervention_action_is_rejected():
    bad_interventions = [
        Intervention(
            action="   ",
            estimated_reduction_kgco2e=1000,
            estimated_cost_inr=500,
        )
    ]

    with pytest.raises(ValueError):
        optimize_decarbonization(
            current_emissions_kgco2e=100000,
            target_reduction_percentage=15,
            budget_inr=1000000,
            interventions=bad_interventions,
        )


def test_invalid_priority_is_rejected():
    bad_interventions = [
        Intervention(
            action="Invalid Priority",
            estimated_reduction_kgco2e=1000,
            estimated_cost_inr=500,
            priority=0,
        )
    ]

    with pytest.raises(ValueError):
        optimize_decarbonization(
            current_emissions_kgco2e=100000,
            target_reduction_percentage=15,
            budget_inr=1000000,
            interventions=bad_interventions,
        )


def test_duplicate_intervention_actions_are_rejected():
    duplicate_interventions = [
        Intervention(
            action="Solar",
            estimated_reduction_kgco2e=1000,
            estimated_cost_inr=100000,
        ),
        Intervention(
            action="Solar",
            estimated_reduction_kgco2e=2000,
            estimated_cost_inr=200000,
        ),
    ]

    with pytest.raises(ValueError):
        optimize_decarbonization(
            current_emissions_kgco2e=100000,
            target_reduction_percentage=15,
            budget_inr=1000000,
            interventions=duplicate_interventions,
        )


def test_duplicate_actions_are_case_insensitive():
    duplicate_interventions = [
        Intervention(
            action="Solar",
            estimated_reduction_kgco2e=1000,
            estimated_cost_inr=100000,
        ),
        Intervention(
            action="solar",
            estimated_reduction_kgco2e=2000,
            estimated_cost_inr=200000,
        ),
    ]

    with pytest.raises(ValueError):
        optimize_decarbonization(
            current_emissions_kgco2e=100000,
            target_reduction_percentage=15,
            budget_inr=1000000,
            interventions=duplicate_interventions,
        )


# ============================================================
# ARITHMETIC CONSISTENCY TESTS
# ============================================================


def test_projected_emissions_arithmetic_is_consistent():
    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
        budget_inr=1500000,
        interventions=get_test_interventions(),
    )

    expected_projected = max(
        0.0,
        100000
        - result["optimized_reduction_kgco2e"],
    )

    assert (
        result["projected_emissions_kgco2e"]
        == expected_projected
    )


def test_budget_arithmetic_is_consistent():
    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
        budget_inr=1500000,
        interventions=get_test_interventions(),
    )

    expected_remaining = max(
        0.0,
        result["budget_inr"]
        - result["budget_used_inr"],
    )

    assert (
        result["remaining_budget_inr"]
        == expected_remaining
    )


def test_recommendations_contain_required_fields():
    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
        budget_inr=1500000,
        interventions=get_test_interventions(),
    )

    required_fields = {
        "action",
        "estimated_reduction_kgco2e",
        "estimated_cost_inr",
        "priority",
    }

    for recommendation in result["recommendations"]:
        assert required_fields.issubset(
            recommendation.keys()
        )


def test_recommendations_are_sorted_by_reduction_descending():
    result = optimize_decarbonization(
        current_emissions_kgco2e=100000,
        target_reduction_percentage=15,
        budget_inr=None,
        interventions=get_test_interventions(),
    )

    reductions = [
        recommendation[
            "estimated_reduction_kgco2e"
        ]
        for recommendation in result["recommendations"]
    ]

    assert reductions == sorted(
        reductions,
        reverse=True,
    )