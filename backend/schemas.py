"""
CarbonTrace shared API schemas.

This file is the single source of truth for API request/response contracts.
All backend modules should import schemas from here instead of defining
duplicate Pydantic request/response models.

Naming conventions:
- IDs: *_id / *_ids
- Quantities include units in the field name
- Boolean fields use is_* naming
- Dates/timestamps use ISO 8601 strings
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, ConfigDict


# ============================================================
# COMMON
# ============================================================

class APIError(BaseModel):
    """Standard API error response."""

    detail: str
    code: str


class HealthResponse(BaseModel):
    status: str
    service: str


# ============================================================
# CARBON / EMISSIONS
# ============================================================

class CarbonActivityCreate(BaseModel):
    """Input for calculating emissions from an activity."""

    company_id: int
    activity_type: str
    activity_quantity: float = Field(gt=0)
    activity_unit: str
    emission_factor: float | None = Field(default=None, ge=0)
    emission_factor_unit: str | None = None
    is_primary: bool = False


class CarbonActivityResponse(BaseModel):
    """Calculated carbon activity result."""

    entry_id: int
    company_id: int
    activity_type: str
    activity_quantity: float
    activity_unit: str
    emissions_kgco2e: float
    is_primary: bool
    is_flagged: bool = False


class CarbonSummaryResponse(BaseModel):
    """Aggregated carbon summary."""

    company_id: int
    total_emissions_kgco2e: float
    primary_emissions_kgco2e: float
    estimated_emissions_kgco2e: float
    primary_data_percentage: float
    flagged_entries_count: int


# ============================================================
# SUPPLIERS / SUPPLY CHAIN
# ============================================================

class SupplierCreate(BaseModel):
    """Create a supplier."""

    supplier_name: str
    company_id: int
    industry: str | None = None
    location: str | None = None


class SupplierResponse(BaseModel):
    """Supplier response."""

    supplier_id: int
    supplier_name: str
    company_id: int
    industry: str | None = None
    location: str | None = None
    is_verified: bool = False


class SupplierEmissionResponse(BaseModel):
    """Supplier carbon information."""

    supplier_id: int
    supplier_name: str
    emissions_kgco2e: float
    is_primary: bool
    is_flagged: bool
    is_verified: bool


# ============================================================
# VERIFICATION / TRUST
# ============================================================

class VerificationEntryCreate(BaseModel):
    """Create an entry in the verification ledger."""

    entry_type: str
    source_id: int
    data_hash: str
    is_primary: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class VerificationEntryResponse(BaseModel):
    """Single verification ledger entry."""

    entry_id: int
    entry_type: str
    source_id: int
    data_hash: str
    previous_hash: str | None
    block_hash: str
    is_primary: bool
    is_verified: bool
    created_at: str


class VerificationResult(BaseModel):
    """Result of an integrity verification."""

    is_verified: bool
    checked_entries: int
    invalid_entries: list[int] = Field(default_factory=list)
    message: str


class VerificationSummaryResponse(BaseModel):
    """Trust/verification summary."""

    company_id: int
    total_entries: int
    verified_entries: int
    primary_entries: int
    estimated_entries: int
    flagged_entries: int
    verification_percentage: float


# ============================================================
# BLOCKCHAIN / CARBON RETIREMENT
# ============================================================

class CarbonRetirementCreate(BaseModel):
    """Request to record/reference a carbon retirement."""

    company_id: int
    amount_kgco2e: float = Field(gt=0)
    certificate_id: str | None = None
    reason: str | None = None


class CarbonRetirementResponse(BaseModel):
    """Carbon retirement result."""

    retirement_id: str
    company_id: int
    amount_kgco2e: float
    certificate_id: str | None = None
    transaction_hash: str | None = None
    is_verified: bool
    status: str


# ============================================================
# OPTIMIZATION
# ============================================================

class OptimizationRequest(BaseModel):
    """Request for carbon reduction optimization."""

    company_id: int
    target_reduction_percentage: float = Field(
        gt=0,
        le=100,
    )
    budget_inr: float | None = Field(default=None, ge=0)


class OptimizationRecommendation(BaseModel):
    """Single optimization recommendation."""

    action: str
    estimated_reduction_kgco2e: float
    estimated_cost_inr: float
    priority: int


class OptimizationResponse(BaseModel):
    """Optimization result."""

    company_id: int
    current_emissions_kgco2e: float
    target_reduction_percentage: float
    recommendations: list[OptimizationRecommendation]
    projected_emissions_kgco2e: float


# ============================================================
# REPORTS / CERTIFICATES
# ============================================================

class ReportRequest(BaseModel):
    """Request for a carbon report."""

    company_id: int
    include_verification: bool = True
    include_supplier_data: bool = True


class ReportResponse(BaseModel):
    """Generated report information."""

    report_id: str
    company_id: int
    report_type: str
    generated_at: str
    download_url: str | None = None


# ============================================================
# AI EXPLANATION
# ============================================================

class AIExplanationRequest(BaseModel):
    """Request for an AI-generated explanation."""

    context_type: str
    context_id: int | None = None
    question: str


class AIExplanationResponse(BaseModel):
    """AI explanation response."""

    explanation: str
    is_fallback: bool = False