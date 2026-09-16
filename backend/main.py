"""
CarbonTrace API Application Entrypoint.

Central FastAPI service integrating Person 1's Data Layer & Carbon Engine,
Person 2's Verification & Trust Layer, and mounting core API routers.
"""

from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import carbon
from constants import (
    API_PREFIX,
    CARBON_PREFIX,
    SERVICE_NAME,
    SUPPLIERS_PREFIX,
    VERIFICATION_PREFIX,
)
from database import Base, engine, get_db
import models
from schemas import (
    CarbonActivityCreate,
    CarbonActivityResponse,
    CarbonSummaryResponse,
    HealthResponse,
    SupplierCreate,
    SupplierEmissionResponse,
    SupplierResponse,
)
import verification


# ============================================================
# APPLICATION LIFECYCLE & INITIALIZATION
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Initializes database tables on startup using SQLAlchemy DeclarativeBase metadata.
    """
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=SERVICE_NAME,
    version="1.0.0",
    description="CarbonTrace Deterministic Carbon Accounting & Verification Engine",
    lifespan=lifespan,
)

# CORS middleware configuration for hackathon web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Service health check",
)
def health_check() -> HealthResponse:
    """Return service health status."""
    return HealthResponse(
        status="healthy",
        service=SERVICE_NAME,
    )


# ============================================================
# PERSON 1: CARBON ENGINE ROUTER
# ============================================================

carbon_router = APIRouter(
    prefix=f"{API_PREFIX}{CARBON_PREFIX}",
    tags=["Carbon Engine"],
)


@carbon_router.post(
    "/activity",
    response_model=CarbonActivityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record carbon activity and calculate emissions",
    description=(
        "Executes deterministic GHG calculations via the carbon engine, "
        "persists the record to the database, and registers a SHA-256 hash "
        "in the verification ledger."
    ),
)
def create_carbon_activity(
    payload: CarbonActivityCreate,
    db: Session = Depends(get_db),
) -> CarbonActivityResponse:
    """
    Execute deterministic carbon calculation, persist to database,
    and register hash in verification ledger.
    """
    # 1. Check if reporting company exists
    company = db.query(models.Company).filter(models.Company.company_id == payload.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {payload.company_id} not found.",
        )

    # 2. Deterministic carbon calculation via carbon.py
    try:
        calc_result = carbon.calculate_activity(
            activity_type=payload.activity_type,
            activity_quantity=payload.activity_quantity,
            activity_unit=payload.activity_unit,
            is_primary=payload.is_primary,
            custom_emission_factor=payload.emission_factor,
        )
    except (
        carbon.UnknownActivityTypeError,
        carbon.PendingFactorError,
        carbon.InvalidQuantityError,
        carbon.UnitMismatchError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    # 3. Instantiate and persist ORM model
    activity = models.CarbonActivity(
        company_id=payload.company_id,
        activity_type=calc_result.activity_type,
        activity_quantity=calc_result.activity_quantity,
        activity_unit=calc_result.activity_unit,
        emission_factor=calc_result.emission_factor,
        emissions_kgco2e=calc_result.emissions_kgco2e,
        is_primary=calc_result.is_primary,
        is_flagged=calc_result.is_flagged,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    # 4. Deterministic verification hash and ledger registration
    # Must happen AFTER successful database persistence using refreshed entry_id
    hash_payload = {
        "entry_id": activity.entry_id,
        "company_id": activity.company_id,
        "activity_type": activity.activity_type,
        "activity_quantity": activity.activity_quantity,
        "activity_unit": activity.activity_unit,
        "emission_factor": activity.emission_factor,
        "emissions_kgco2e": activity.emissions_kgco2e,
        "is_primary": activity.is_primary,
    }
    data_hash = verification.compute_data_hash(hash_payload)
    verification.ledger.add_entry(
        entry_type="carbon_activity",
        source_id=activity.entry_id,
        data_hash=data_hash,
        is_primary=activity.is_primary,
        metadata={
            "company_id": activity.company_id,
            "is_flagged": activity.is_flagged,
        },
    )

    # 5. Return typed response
    return CarbonActivityResponse(
        entry_id=activity.entry_id,
        company_id=activity.company_id,
        activity_type=activity.activity_type,
        activity_quantity=activity.activity_quantity,
        activity_unit=activity.activity_unit,
        emissions_kgco2e=activity.emissions_kgco2e,
        is_primary=activity.is_primary,
        is_flagged=activity.is_flagged,
    )


@carbon_router.get(
    "/summary/{company_id}",
    response_model=CarbonSummaryResponse,
    summary="Get aggregated carbon emissions summary for a company",
    description="Aggregates emissions data across all recorded activities for a company.",
)
def get_carbon_summary(
    company_id: int,
    db: Session = Depends(get_db),
) -> CarbonSummaryResponse:
    """Retrieve aggregated emissions summary computed by carbon.py."""
    company = db.query(models.Company).filter(models.Company.company_id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found.",
        )

    activities = (
        db.query(models.CarbonActivity)
        .filter(models.CarbonActivity.company_id == company_id)
        .all()
    )
    summary = carbon.aggregate_company_summary(company_id=company_id, activities=activities)

    return CarbonSummaryResponse(
        company_id=summary.company_id,
        total_emissions_kgco2e=summary.total_emissions_kgco2e,
        primary_emissions_kgco2e=summary.primary_emissions_kgco2e,
        estimated_emissions_kgco2e=summary.estimated_emissions_kgco2e,
        primary_data_percentage=summary.primary_data_percentage,
        flagged_entries_count=summary.flagged_entries_count,
    )


@carbon_router.get(
    "/activities/{company_id}",
    response_model=list[CarbonActivityResponse],
    summary="List all recorded carbon activities for a company",
    description="Returns all carbon activity records associated with the specified company ID.",
)
def list_carbon_activities(
    company_id: int,
    db: Session = Depends(get_db),
) -> list[CarbonActivityResponse]:
    """Retrieve all recorded activities for a given company."""
    company = db.query(models.Company).filter(models.Company.company_id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found.",
        )

    activities = (
        db.query(models.CarbonActivity)
        .filter(models.CarbonActivity.company_id == company_id)
        .order_by(models.CarbonActivity.entry_id.asc())
        .all()
    )
    return [
        CarbonActivityResponse(
            entry_id=a.entry_id,
            company_id=a.company_id,
            activity_type=a.activity_type,
            activity_quantity=a.activity_quantity,
            activity_unit=a.activity_unit,
            emissions_kgco2e=a.emissions_kgco2e,
            is_primary=a.is_primary,
            is_flagged=a.is_flagged,
        )
        for a in activities
    ]


# ============================================================
# PERSON 1: SUPPLIERS ROUTER
# ============================================================

supplier_router = APIRouter(
    prefix=f"{API_PREFIX}{SUPPLIERS_PREFIX}",
    tags=["Suppliers"],
)


@supplier_router.post(
    "/",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new supplier for a company",
    description="Creates and persists a supplier record without registering a verification ledger entry.",
)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
) -> SupplierResponse:
    """Create and persist a new supplier."""
    company = db.query(models.Company).filter(models.Company.company_id == payload.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {payload.company_id} not found.",
        )

    supplier = models.Supplier(
        supplier_name=payload.supplier_name,
        company_id=payload.company_id,
        industry=payload.industry,
        location=payload.location,
        is_verified=False,
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    return SupplierResponse(
        supplier_id=supplier.supplier_id,
        supplier_name=supplier.supplier_name,
        company_id=supplier.company_id,
        industry=supplier.industry,
        location=supplier.location,
        is_verified=supplier.is_verified,
    )


@supplier_router.get(
    "/{company_id}",
    response_model=list[SupplierResponse],
    summary="List all suppliers belonging to a company",
    description="Returns all supplier records registered for the specified company ID.",
)
def list_company_suppliers(
    company_id: int,
    db: Session = Depends(get_db),
) -> list[SupplierResponse]:
    """List all registered suppliers for a company."""
    company = db.query(models.Company).filter(models.Company.company_id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found.",
        )

    suppliers = (
        db.query(models.Supplier)
        .filter(models.Supplier.company_id == company_id)
        .order_by(models.Supplier.supplier_id.asc())
        .all()
    )
    return [
        SupplierResponse(
            supplier_id=s.supplier_id,
            supplier_name=s.supplier_name,
            company_id=s.company_id,
            industry=s.industry,
            location=s.location,
            is_verified=s.is_verified,
        )
        for s in suppliers
    ]


@supplier_router.get(
    "/{supplier_id}/emissions",
    response_model=SupplierEmissionResponse,
    summary="Get aggregated emissions for a supplier",
    description="Calculates supplier emissions from existing CarbonActivity records associated with that supplier.",
)
def get_supplier_emissions(
    supplier_id: int,
    db: Session = Depends(get_db),
) -> SupplierEmissionResponse:
    """Calculate aggregated emissions for a specific supplier from recorded activities."""
    supplier = db.query(models.Supplier).filter(models.Supplier.supplier_id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with ID {supplier_id} not found.",
        )

    activities = (
        db.query(models.CarbonActivity)
        .filter(models.CarbonActivity.supplier_id == supplier_id)
        .all()
    )
    total_emissions = sum(a.emissions_kgco2e for a in activities)
    has_activities = len(activities) > 0
    all_primary = has_activities and all(a.is_primary for a in activities)
    any_flagged = any(a.is_flagged for a in activities)

    return SupplierEmissionResponse(
        supplier_id=supplier.supplier_id,
        supplier_name=supplier.supplier_name,
        emissions_kgco2e=round(total_emissions, 4),
        is_primary=all_primary,
        is_flagged=any_flagged,
        is_verified=supplier.is_verified,
    )


# ============================================================
# ROUTER MOUNTING
# ============================================================

# Mount Person 1 routers
app.include_router(carbon_router)
app.include_router(supplier_router)

# Mount Person 2 verification router
app.include_router(
    verification.router,
    prefix=f"{API_PREFIX}{VERIFICATION_PREFIX}",
)
