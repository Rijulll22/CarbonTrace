"""
CarbonTrace deterministic demo dataset.

This module defines the seed data used by the CarbonTrace demo.

Responsibilities:
- Provide deterministic ABC Manufacturing demo data.
- Keep demo records structured and easy to persist later.
- Provide activity and supplier data for the carbon engine and optimizer.
- Provide a consistent mix of primary and estimated data.
- Avoid database-specific assumptions until the shared SQLAlchemy models
  are finalized.

Important:
- Emission calculations remain deterministic.
- This module does not calculate emissions using an LLM.
- This module does not implement verification/hash-chain logic.
- Verification records must be created through verification.py's public API
  once real database activity IDs are available.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


# ---------------------------------------------------------------------------
# Demo company
# ---------------------------------------------------------------------------

DEMO_COMPANY = {
    "id": 1,
    "name": "ABC Manufacturing",
    "reporting_period": "FY2025-26",
}


# ---------------------------------------------------------------------------
# Demo activities
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class DemoActivity:
    """
    Deterministic demo carbon activity.

    `is_primary` indicates whether the activity represents primary source data
    or estimated/secondary demo data.

    The actual database ID is intentionally not assigned here. The database
    layer must generate the real activity ID when the record is persisted.
    """

    activity_key: str
    activity_type: str
    category: str
    quantity: float
    unit: str
    emission_factor: float
    emission_factor_unit: str
    scope: int
    source: str
    is_primary: bool


DEMO_ACTIVITIES: tuple[DemoActivity, ...] = (
    DemoActivity(
        activity_key="electricity_grid",
        activity_type="grid_electricity",
        category="Purchased Electricity",
        quantity=100_000.0,
        unit="kWh",
        emission_factor=0.72,
        emission_factor_unit="kgCO2e/kWh",
        scope=2,
        source="Utility electricity records",
        is_primary=True,
    ),
    DemoActivity(
        activity_key="diesel_fleet",
        activity_type="diesel_fleet",
        category="Company Vehicles",
        quantity=30_000.0,
        unit="litres",
        emission_factor=2.68,
        emission_factor_unit="kgCO2e/litre",
        scope=1,
        source="Fleet fuel records",
        is_primary=True,
    ),
    DemoActivity(
        activity_key="natural_gas",
        activity_type="natural_gas",
        category="Industrial Fuel",
        quantity=20_000.0,
        unit="m3",
        emission_factor=2.02,
        emission_factor_unit="kgCO2e/m3",
        scope=1,
        source="Fuel consumption records",
        is_primary=True,
    ),
    DemoActivity(
        activity_key="freight_transport",
        activity_type="freight_transport",
        category="Inbound Logistics",
        quantity=500.0,
        unit="tonne-km",
        emission_factor=0.20,
        emission_factor_unit="kgCO2e/tonne-km",
        scope=3,
        source="Estimated logistics activity",
        is_primary=False,
    ),
    DemoActivity(
        activity_key="supplier_electricity",
        activity_type="supplier_electricity",
        category="Purchased Goods and Services",
        quantity=40_000.0,
        unit="kWh",
        emission_factor=0.72,
        emission_factor_unit="kgCO2e/kWh",
        scope=3,
        source="Supplier-provided activity data",
        is_primary=True,
    ),
    DemoActivity(
        activity_key="business_travel",
        activity_type="business_travel",
        category="Business Travel",
        quantity=25_000.0,
        unit="passenger-km",
        emission_factor=0.14,
        emission_factor_unit="kgCO2e/passenger-km",
        scope=3,
        source="Estimated travel activity",
        is_primary=False,
    ),
)


# ---------------------------------------------------------------------------
# Demo suppliers
# ---------------------------------------------------------------------------

DEMO_SUPPLIERS = (
    {
        "id": 1,
        "company_id": DEMO_COMPANY["id"],
        "name": "Supplier A",
        "category": "Raw Materials",
        "industry": "Steel",
        "location": "Tamil Nadu, India",
        "is_verified": True,
    },
    {
        "id": 2,
        "company_id": DEMO_COMPANY["id"],
        "name": "Supplier B",
        "category": "Components",
        "industry": "Electronics",
        "location": "Karnataka, India",
        "is_verified": False,
    },
    {
        "id": 3,
        "company_id": DEMO_COMPANY["id"],
        "name": "Supplier C",
        "category": "Packaging",
        "industry": "Packaging",
        "location": "Maharashtra, India",
        "is_verified": True,
    },
)


# ---------------------------------------------------------------------------
# Demo supplier emissions
# ---------------------------------------------------------------------------

DEMO_SUPPLIER_EMISSIONS = (
    {
        "supplier_id": 1,
        "activity": "Raw material production",
        "emissions_kgco2e": 180_000.0,
        "is_primary": True,
    },
    {
        "supplier_id": 2,
        "activity": "Electronic component production",
        "emissions_kgco2e": 240_000.0,
        "is_primary": False,
    },
    {
        "supplier_id": 3,
        "activity": "Packaging production",
        "emissions_kgco2e": 95_000.0,
        "is_primary": True,
    },
)


# ---------------------------------------------------------------------------
# Demo optimization interventions
# ---------------------------------------------------------------------------

DEMO_INTERVENTIONS = (
    {
        "action": "Solar Power Purchase",
        "estimated_reduction_kgco2e": 400_000.0,
        "estimated_cost_inr": 800_000.0,
        "priority": 1,
    },
    {
        "action": "Fleet Electrification",
        "estimated_reduction_kgco2e": 700_000.0,
        "estimated_cost_inr": 1_200_000.0,
        "priority": 1,
    },
    {
        "action": "Freight Route Optimization",
        "estimated_reduction_kgco2e": 250_000.0,
        "estimated_cost_inr": 300_000.0,
        "priority": 2,
    },
    {
        "action": "Supplier Renewable Electricity",
        "estimated_reduction_kgco2e": 350_000.0,
        "estimated_cost_inr": 500_000.0,
        "priority": 1,
    },
    {
        "action": "Material Efficiency Program",
        "estimated_reduction_kgco2e": 280_000.0,
        "estimated_cost_inr": 450_000.0,
        "priority": 2,
    },
)


# ---------------------------------------------------------------------------
# Public data builders
# ---------------------------------------------------------------------------

def get_demo_company() -> dict[str, Any]:
    """Return a copy of the demo company record."""
    return dict(DEMO_COMPANY)


def get_demo_activities() -> list[dict[str, Any]]:
    """
    Return deterministic activity records.

    The returned records contain no database-generated ID. The persistence
    layer is responsible for creating the actual database IDs.
    """
    return [asdict(activity) for activity in DEMO_ACTIVITIES]


def get_demo_suppliers() -> list[dict[str, Any]]:
    """Return copies of the demo supplier records."""
    return [dict(supplier) for supplier in DEMO_SUPPLIERS]


def get_demo_supplier_emissions() -> list[dict[str, Any]]:
    """Return copies of the demo supplier-emission records."""
    return [dict(record) for record in DEMO_SUPPLIER_EMISSIONS]


def get_demo_interventions() -> list[dict[str, Any]]:
    """Return copies of the demo optimization interventions."""
    return [dict(intervention) for intervention in DEMO_INTERVENTIONS]


def calculate_demo_emissions(activity: DemoActivity) -> float:
    """
    Calculate emissions for one demo activity.

    This is intentionally deterministic:

        emissions = quantity × emission_factor
    """
    return activity.quantity * activity.emission_factor


def get_demo_emission_summary() -> dict[str, float]:
    """Return deterministic Scope 1/2/3 and total demo emissions."""

    scope_totals = {
        "scope_1_kgco2e": 0.0,
        "scope_2_kgco2e": 0.0,
        "scope_3_kgco2e": 0.0,
    }

    for activity in DEMO_ACTIVITIES:
        emissions = calculate_demo_emissions(activity)
        scope_totals[f"scope_{activity.scope}_kgco2e"] += emissions

    scope_totals["total_emissions_kgco2e"] = sum(scope_totals.values())

    return scope_totals


def build_verification_payload(
    activity: DemoActivity,
) -> dict[str, Any]:
    """
    Build the deterministic activity payload that can later be passed to
    verification.compute_data_hash().

    This function does NOT hash the data and does NOT interact with the
    verification ledger.

    The caller must supply the real database activity ID when creating the
    verification ledger entry.
    """
    return {
        "activity_key": activity.activity_key,
        "activity_type": activity.activity_type,
        "category": activity.category,
        "quantity": activity.quantity,
        "unit": activity.unit,
        "emission_factor": activity.emission_factor,
        "emission_factor_unit": activity.emission_factor_unit,
        "scope": activity.scope,
        "source": activity.source,
        "is_primary": activity.is_primary,
    }


def build_verification_record(
    activity: DemoActivity,
    activity_id: int,
    company_id: int = DEMO_COMPANY["id"],
) -> dict[str, Any]:
    """
    Build the information required by verification.ledger.add_entry().

    This does not call verification.py. It only prepares the arguments so
    the database persistence layer can connect the real activity ID to the
    verification layer.

    The actual verification call must use:

        verification.compute_data_hash(...)
        verification.ledger.add_entry(...)
    """
    return {
        "entry_type": f"seed_demo_{activity.activity_key}",
        "source_id": activity_id,
        "data": build_verification_payload(activity),
        "is_primary": activity.is_primary,
        "metadata": {
            "company_id": company_id,
            "note": "seed demo data",
            "activity_key": activity.activity_key,
        },
    }


# ---------------------------------------------------------------------------
# Demo dataset
# ---------------------------------------------------------------------------

def get_demo_dataset() -> dict[str, Any]:
    """
    Return the complete deterministic CarbonTrace demo dataset.

    This function is intentionally side-effect free. Database insertion and
    verification-ledger insertion will be handled by the integration layer
    once the shared database models are finalized.
    """
    return {
        "company": get_demo_company(),
        "activities": get_demo_activities(),
        "suppliers": get_demo_suppliers(),
        "supplier_emissions": get_demo_supplier_emissions(),
        "interventions": get_demo_interventions(),
        "emission_summary": get_demo_emission_summary(),
    }


def seed_demo_data(db: Any) -> dict[str, Any]:
    """
    Persist the deterministic CarbonTrace demo dataset into the database
    and register corresponding cryptographic verification blocks in the
    verification ledger.

    Uses real database IDs for verification records and maintains idempotency.
    """
    import models
    import verification

    # 1. Ensure Demo Company exists
    company = db.query(models.Company).filter(models.Company.company_id == DEMO_COMPANY["id"]).first()
    if not company:
        company = models.Company(
            company_id=DEMO_COMPANY["id"],
            company_name=DEMO_COMPANY["name"],
            industry="Manufacturing",
            location="Tamil Nadu, India",
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    # 2. Ensure Demo Suppliers exist
    supplier_map: dict[str, int] = {}
    for sup in DEMO_SUPPLIERS:
        existing_sup = (
            db.query(models.Supplier)
            .filter(
                models.Supplier.company_id == DEMO_COMPANY["id"],
                models.Supplier.supplier_name == sup["name"],
            )
            .first()
        )
        if not existing_sup:
            existing_sup = models.Supplier(
                company_id=DEMO_COMPANY["id"],
                supplier_name=sup["name"],
                industry=sup.get("industry"),
                location=sup.get("location"),
                is_verified=sup.get("is_verified", False),
            )
            db.add(existing_sup)
            db.commit()
            db.refresh(existing_sup)
        supplier_map[sup["name"]] = existing_sup.supplier_id

    # 3. Clean previous demo activities for this company to ensure clean idempotency
    existing_activities = (
        db.query(models.CarbonActivity)
        .filter(models.CarbonActivity.company_id == DEMO_COMPANY["id"])
        .all()
    )
    for act in existing_activities:
        db.delete(act)
    db.commit()

    # Reset in-memory verification ledger
    verification.ledger.reset_ledger()

    # 4. Persist Carbon Activities and create verification ledger entries
    seeded_activities: list[models.CarbonActivity] = []
    for activity in DEMO_ACTIVITIES:
        emissions = calculate_demo_emissions(activity)

        assigned_supplier_id = None
        if "supplier" in activity.activity_key:
            assigned_supplier_id = supplier_map.get("Supplier A")

        act_record = models.CarbonActivity(
            company_id=DEMO_COMPANY["id"],
            supplier_id=assigned_supplier_id,
            activity_type=activity.activity_type,
            activity_quantity=activity.quantity,
            activity_unit=activity.unit,
            emission_factor=activity.emission_factor,
            emissions_kgco2e=round(emissions, 4),
            is_primary=activity.is_primary,
            is_flagged=False,
        )
        db.add(act_record)
        db.commit()
        db.refresh(act_record)
        seeded_activities.append(act_record)

        # Build verification payload and register in ledger with real DB entry_id
        hash_payload = {
            "entry_id": act_record.entry_id,
            "company_id": act_record.company_id,
            "activity_type": act_record.activity_type,
            "activity_quantity": act_record.activity_quantity,
            "activity_unit": act_record.activity_unit,
            "emission_factor": act_record.emission_factor,
            "emissions_kgco2e": act_record.emissions_kgco2e,
            "is_primary": act_record.is_primary,
        }
        data_hash = verification.compute_data_hash(hash_payload)
        verification.ledger.add_entry(
            entry_type=f"carbon_activity_{activity.activity_key}",
            source_id=act_record.entry_id,
            data_hash=data_hash,
            is_primary=act_record.is_primary,
            metadata={
                "company_id": act_record.company_id,
                "activity_key": activity.activity_key,
                "category": activity.category,
                "is_flagged": act_record.is_flagged,
            },
        )

    return {
        "status": "seeded",
        "company_id": DEMO_COMPANY["id"],
        "company_name": DEMO_COMPANY["name"],
        "activities_seeded": len(seeded_activities),
        "suppliers_seeded": len(supplier_map),
        "total_emissions_kgco2e": sum(a.emissions_kgco2e for a in seeded_activities),
        "ledger_entries_count": len(verification.ledger.list_entries()),
        "message": "Demo data successfully seeded into database and verification ledger.",
    }


if __name__ == "__main__":
    dataset = get_demo_dataset()

    print("CarbonTrace demo dataset")
    print("=" * 40)
    print(f"Company: {dataset['company']['name']}")
    print(f"Activities: {len(dataset['activities'])}")
    print(f"Suppliers: {len(dataset['suppliers'])}")
    print(f"Interventions: {len(dataset['interventions'])}")
    print()
    print("Emission summary:")
    for key, value in dataset["emission_summary"].items():
        print(f"  {key}: {value:,.2f}")