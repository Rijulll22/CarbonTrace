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

from typing import Any

from pydantic import BaseModel, Field


class APIError(BaseModel):
    detail: str
    code: str


class HealthResponse(BaseModel):
    status: str
    service: str


# ---------------------------------------------------------------------------
# Carbon Activity
# ---------------------------------------------------------------------------

class CarbonActivityCreate(BaseModel):
    company_id: int
    activity_type: str
    activity_quantity: float = Field(gt=0)
    activity_unit: str
    emission_factor: float | None = Field(default=None, ge=0)
    emission_factor_unit: str | None = None
    is_primary: bool = False


class CarbonActivityResponse(BaseModel):
    entry_id: int
    company_id: int
    activity_type: str
    activity_quantity: float
    activity_unit: str
    emissions_kgco2e: float
    is_primary: bool
    is_flagged: bool = False


class CarbonSummaryResponse(BaseModel):
    company_id: int
    total_emissions_kgco2e: float
    primary_emissions_kgco2e: float
    estimated_emissions_kgco2e: float
    primary_data_percentage: float
    flagged_entries_count: int


# ---------------------------------------------------------------------------
# Suppliers
# ---------------------------------------------------------------------------

class SupplierCreate(BaseModel):
    supplier_name: str
    company_id: int
    industry: str | None = None
    location: str | None = None


class SupplierResponse(BaseModel):
    supplier_id: int
    supplier_name: str
    company_id: int
    industry: str | None = None
    location: str | None = None
    is_verified: bool = False


class SupplierEmissionResponse(BaseModel):
    supplier_id: int
    supplier_name: str
    emissions_kgco2e: float
    is_primary: bool
    is_flagged: bool
    is_verified: bool


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

class VerificationEntryCreate(BaseModel):
    entry_type: str
    source_id: int
    data_hash: str
    is_primary: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class VerificationEntryResponse(BaseModel):
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
    is_verified: bool
    checked_entries: int
    invalid_entries: list[int] = Field(default_factory=list)
    message: str


class VerificationSummaryResponse(BaseModel):
    company_id: int
    total_entries: int
    verified_entries: int
    primary_entries: int
    estimated_entries: int
    flagged_entries: int
    verification_percentage: float


# ---------------------------------------------------------------------------
# Carbon Retirement
# ---------------------------------------------------------------------------
# Kept for API compatibility with the shared contract.
# Retirement/settlement is NOT part of the current CarbonTrace implementation.

class CarbonRetirementCreate(BaseModel):
    company_id: int
    amount_kgco2e: float = Field(gt=0)
    certificate_id: str | None = None
    reason: str | None = None


class CarbonRetirementResponse(BaseModel):
    retirement_id: str
    company_id: int
    amount_kgco2e: float
    certificate_id: str | None = None
    transaction_hash: str | None = None
    is_verified: bool
    status: str


# ---------------------------------------------------------------------------
# Optimization
# ---------------------------------------------------------------------------

class OptimizationRequest(BaseModel):
    company_id: int
    target_reduction_percentage: float = Field(
        gt=0,
        le=100,
    )
    budget_inr: float | None = Field(default=None, ge=0)


class OptimizationRecommendation(BaseModel):
    action: str
    estimated_reduction_kgco2e: float
    estimated_cost_inr: float
    priority: int


class OptimizationResponse(BaseModel):
    company_id: int

    current_emissions_kgco2e: float
    target_reduction_percentage: float

    target_emissions_kgco2e: float
    required_reduction_kgco2e: float
    optimized_reduction_kgco2e: float

    projected_emissions_kgco2e: float
    residual_emissions_kgco2e: float

    budget_inr: float | None
    budget_used_inr: float
    remaining_budget_inr: float | None

    target_achieved: bool
    status: str

    recommendations: list[OptimizationRecommendation]


# ---------------------------------------------------------------------------
# CSV Upload
# ---------------------------------------------------------------------------

class CarbonCSVUploadRequest(BaseModel):
    company_id: int
    filename: str
    content: str  # Raw CSV string


class CarbonCSVUploadResponse(BaseModel):
    filename: str
    activities_imported: int
    total_emissions_kgco2e: float
    primary_activities_count: int
    estimated_activities_count: int
    ledger_entries_registered: int
    entries: list[CarbonActivityResponse]
    message: str


# ---------------------------------------------------------------------------
# Reporting & Signing
# ---------------------------------------------------------------------------

class ReportRequest(BaseModel):
    company_id: int
    include_verification: bool = True
    include_supplier_data: bool = True


class ReportResponse(BaseModel):
    report_id: str
    company_id: int
    report_type: str
    generated_at: str
    download_url: str | None = None


class ReportSignRequest(BaseModel):
    company_id: int
    signer_name: str
    signer_role: str
    is_confirmed: bool
    notes: str | None = None


class ReportSignResponse(BaseModel):
    report_id: str
    company_id: int
    signed_at: str
    signer_name: str
    signer_role: str
    signature_hash: str
    is_verified: bool
    status: str
    total_emissions_kgco2e: float
    message: str


class BRSRSupplierSummary(BaseModel):
    supplier_id: int
    supplier_name: str
    industry: str | None = None
    location: str | None = None
    emissions_kgco2e: float
    is_primary: bool
    is_verified: bool


class BRSRSectionHeader(BaseModel):
    report_id: str
    company_name: str
    company_id: int
    reporting_period: str
    industry: str | None = None
    location: str | None = None
    generated_at: str
    standard: str = "GHG Protocol Corporate Standard / SEBI BRSR Core aligned"


class BRSRDecarbonizationPlan(BaseModel):
    target_reduction_percentage: float
    target_emissions_kgco2e: float
    optimized_reduction_kgco2e: float
    residual_emissions_kgco2e: float
    budget_inr: float | None
    budget_used_inr: float
    target_achieved: bool
    status: str
    recommendations: list[OptimizationRecommendation]


class BRSRReportResponse(BaseModel):
    header: BRSRSectionHeader
    executive_summary: str
    is_ai_generated: bool
    is_fallback_ai: bool
    total_emissions_kgco2e: float
    scope_1_emissions_kgco2e: float
    scope_2_emissions_kgco2e: float
    scope_3_emissions_kgco2e: float
    primary_emissions_kgco2e: float
    estimated_emissions_kgco2e: float
    primary_data_percentage: float
    flagged_entries_count: int
    top_suppliers: list[BRSRSupplierSummary]
    verification_summary: VerificationSummaryResponse
    hash_chain_valid: bool
    decarbonization_plan: BRSRDecarbonizationPlan
    ai_explanation: str
    approval: ReportSignResponse | None = None
    disclaimer: str


# ---------------------------------------------------------------------------
# AI Explanation
# ---------------------------------------------------------------------------

class AIExplanationRequest(BaseModel):
    context_type: str
    context_id: int | None = None
    question: str


class AIExplanationResponse(BaseModel):
    explanation: str
    is_fallback: bool = False