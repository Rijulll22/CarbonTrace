"""
CarbonTrace API Application Entrypoint.

Central FastAPI service integrating Person 1's Data Layer & Carbon Engine,
Person 2's Verification & Trust Layer, and mounting core API routers.
"""

from contextlib import asynccontextmanager
from typing import Any

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import ai
import carbon
from constants import (
    AI_PREFIX,
    API_PREFIX,
    CARBON_PREFIX,
    OPTIMIZATION_PREFIX,
    SERVICE_NAME,
    SUPPLIERS_PREFIX,
    VERIFICATION_PREFIX,
)
from database import Base, engine, get_db
import models
import optimizer
from schemas import (
    AIExplanationRequest,
    AIExplanationResponse,
    CarbonActivityCreate,
    CarbonActivityResponse,
    CarbonSummaryResponse,
    HealthResponse,
    OptimizationRecommendation,
    OptimizationRequest,
    OptimizationResponse,
    SupplierCreate,
    SupplierEmissionResponse,
    SupplierResponse,
)
import seed_demo
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


@app.get(
    "/",
    tags=["Root"],
    summary="Service root information",
)
def root() -> dict[str, str]:
    """Return basic service discovery information."""
    return {
        "service": SERVICE_NAME,
        "docs": "/docs",
        "api_prefix": API_PREFIX,
    }


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
# PERSON 3: OPTIMIZATION ROUTER
# ============================================================

optimization_router = APIRouter(
    prefix=f"{API_PREFIX}{OPTIMIZATION_PREFIX}",
    tags=["Optimization"],
)


@optimization_router.post(
    "",
    response_model=OptimizationResponse,
    summary="Optimize decarbonization interventions",
    description=(
        "Solves a mixed-integer linear programming (MILP) problem to maximize "
        "carbon reduction within an optional budget constraint."
    ),
)
def optimize_interventions(
    payload: OptimizationRequest,
    db: Session = Depends(get_db),
) -> OptimizationResponse:
    """Execute decarbonization optimization."""
    company = db.query(models.Company).filter(models.Company.company_id == payload.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {payload.company_id} not found.",
        )

    # Aggregate baseline emissions from recorded activities
    activities = (
        db.query(models.CarbonActivity)
        .filter(models.CarbonActivity.company_id == payload.company_id)
        .all()
    )
    if activities:
        summary = carbon.aggregate_company_summary(
            company_id=payload.company_id,
            activities=activities,
        )
        current_emissions = summary.total_emissions_kgco2e
    else:
        current_emissions = 0.0

    # Load interventions
    interventions = [
        optimizer.Intervention(
            action=item["action"],
            estimated_reduction_kgco2e=float(item["estimated_reduction_kgco2e"]),
            estimated_cost_inr=float(item["estimated_cost_inr"]),
            priority=int(item.get("priority", 1)),
        )
        for item in seed_demo.get_demo_interventions()
    ]

    try:
        result = optimizer.optimize_decarbonization(
            current_emissions_kgco2e=current_emissions,
            target_reduction_percentage=payload.target_reduction_percentage,
            budget_inr=payload.budget_inr,
            interventions=interventions,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return OptimizationResponse(
        company_id=payload.company_id,
        current_emissions_kgco2e=result["current_emissions_kgco2e"],
        target_reduction_percentage=payload.target_reduction_percentage,
        target_emissions_kgco2e=result["target_emissions_kgco2e"],
        required_reduction_kgco2e=result["required_reduction_kgco2e"],
        optimized_reduction_kgco2e=result["optimized_reduction_kgco2e"],
        projected_emissions_kgco2e=result["projected_emissions_kgco2e"],
        residual_emissions_kgco2e=result["residual_emissions_kgco2e"],
        budget_inr=result["budget_inr"],
        budget_used_inr=result["budget_used_inr"],
        remaining_budget_inr=result["remaining_budget_inr"],
        target_achieved=result["target_achieved"],
        status=result["status"],
        recommendations=[
            OptimizationRecommendation(**rec) for rec in result["recommendations"]
        ],
    )


# ============================================================
# PERSON 3: AI EXPLANATION ROUTER
# ============================================================

ai_router = APIRouter(
    prefix=f"{API_PREFIX}{AI_PREFIX}",
    tags=["AI Explanation"],
)


@ai_router.post(
    "/explain",
    response_model=AIExplanationResponse,
    summary="Generate AI explanation for carbon, verification, or optimization data",
    description=(
        "Generates clear natural-language business explanations for calculated results "
        "using OpenRouter/OpenAI with deterministic fallback when offline."
    ),
)
def generate_ai_explanation(
    payload: AIExplanationRequest,
    db: Session = Depends(get_db),
) -> AIExplanationResponse:
    """Generate AI explanation for reporting context."""
    context_data: dict[str, Any] = {"context_type": payload.context_type}

    if payload.context_id is not None:
        context_data["context_id"] = payload.context_id
        if payload.context_type == "emissions":
            company = db.query(models.Company).filter(models.Company.company_id == payload.context_id).first()
            if company:
                activities = (
                    db.query(models.CarbonActivity)
                    .filter(models.CarbonActivity.company_id == payload.context_id)
                    .all()
                )
                summary = carbon.aggregate_company_summary(payload.context_id, activities)
                context_data.update({
                    "company_name": company.company_name,
                    "total_emissions_kgco2e": summary.total_emissions_kgco2e,
                    "primary_emissions_kgco2e": summary.primary_emissions_kgco2e,
                    "estimated_emissions_kgco2e": summary.estimated_emissions_kgco2e,
                    "primary_data_percentage": summary.primary_data_percentage,
                    "flagged_entries_count": summary.flagged_entries_count,
                })
        elif payload.context_type == "verification":
            summary_ver = verification.ledger.get_summary(payload.context_id)
            context_data.update({
                "total_entries": summary_ver.total_entries,
                "verified_entries": summary_ver.verified_entries,
                "primary_entries": summary_ver.primary_entries,
                "estimated_entries": summary_ver.estimated_entries,
                "verification_percentage": summary_ver.verification_percentage,
            })

    try:
        result = ai.generate_explanation(
            context_type=payload.context_type,
            context=context_data,
            question=payload.question,
        )
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return AIExplanationResponse(
        explanation=result["explanation"],
        is_fallback=result.get("is_fallback", False),
    )


# ============================================================
# PERSON 3: DEMO SEED ROUTER
# ============================================================

seed_router = APIRouter(
    prefix=API_PREFIX,
    tags=["Demo / Seed"],
)


@seed_router.post(
    "/seed",
    summary="Seed demo dataset into database and verification ledger",
    description=(
        "Populates deterministic demo company, suppliers, and carbon activities in the database, "
        "and registers corresponding SHA-256 blocks in the verification ledger."
    ),
)
def seed_demo_endpoint(
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Seed database and verification ledger with demo data."""
    return seed_demo.seed_demo_data(db)


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

# Mount Person 3 routers
app.include_router(optimization_router)
app.include_router(ai_router)
app.include_router(seed_router)

