/**
 * CarbonTrace API Layer
 *
 * Central API communication layer for the CarbonTrace frontend.
 * All backend interactions go through typed helper functions here.
 * Never scatter raw fetch() calls across components.
 *
 * Base URL is configured via VITE_API_BASE_URL environment variable.
 * Default: http://127.0.0.1:8000
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8000'

// ─── Generic fetch helper ─────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body?.detail ?? detail
    } catch { /* ignore parse errors */ }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

// ─── Types matching FastAPI schemas exactly ───────────────────────────────────

export interface CarbonSummary {
  company_id: number
  total_emissions_kgco2e: number
  primary_emissions_kgco2e: number
  estimated_emissions_kgco2e: number
  primary_data_percentage: number
  flagged_entries_count: number
}

export interface CarbonActivity {
  entry_id: number
  company_id: number
  activity_type: string
  activity_quantity: number
  activity_unit: string
  emissions_kgco2e: number
  is_primary: boolean
  is_flagged: boolean
}

export interface SupplierRecord {
  supplier_id: number
  supplier_name: string
  company_id: number
  industry: string | null
  location: string | null
  is_verified: boolean
}

export interface SupplierEmission {
  supplier_id: number
  supplier_name: string
  emissions_kgco2e: number
  is_primary: boolean
  is_flagged: boolean
  is_verified: boolean
}

export interface VerificationEntry {
  entry_id: number
  entry_type: string
  source_id: number
  data_hash: string
  previous_hash: string | null
  block_hash: string
  is_primary: boolean
  is_verified: boolean
  created_at: string
}

export interface VerificationResult {
  is_verified: boolean
  checked_entries: number
  invalid_entries: number[]
  message: string
}

export interface VerificationSummary {
  company_id: number
  total_entries: number
  verified_entries: number
  primary_entries: number
  estimated_entries: number
  flagged_entries: number
  verification_percentage: number
}

export interface OptimizationRequest {
  company_id: number
  target_reduction_percentage: number
  budget_inr?: number | null
}

export interface OptimizationRecommendation {
  action: string
  estimated_reduction_kgco2e: number
  estimated_cost_inr: number
  priority: number
}

export interface OptimizationResponse {
  company_id: number
  current_emissions_kgco2e: number
  target_reduction_percentage: number
  target_emissions_kgco2e: number
  required_reduction_kgco2e: number
  optimized_reduction_kgco2e: number
  projected_emissions_kgco2e: number
  residual_emissions_kgco2e: number
  budget_inr: number | null
  budget_used_inr: number
  remaining_budget_inr: number | null
  target_achieved: boolean
  status: string
  recommendations: OptimizationRecommendation[]
}

export interface AIExplanationRequest {
  context_type: string
  context_id?: number | null
  question: string
}

export interface AIExplanationResponse {
  explanation: string
  is_fallback: boolean
}

export interface SeedResponse {
  status: string
  company_id: number
  company_name: string
  activities_seeded: number
  suppliers_seeded: number
  total_emissions_kgco2e: number
  ledger_entries_count: number
  message: string
}

// ─── API helper functions ─────────────────────────────────────────────────────

/** GET /api/v1/carbon/summary/{company_id} */
export function getCarbonSummary(companyId: number) {
  return apiFetch<CarbonSummary>(`/api/v1/carbon/summary/${companyId}`)
}

/** GET /api/v1/carbon/activities/{company_id} */
export function getCarbonActivities(companyId: number) {
  return apiFetch<CarbonActivity[]>(`/api/v1/carbon/activities/${companyId}`)
}

/** GET /api/v1/suppliers/{company_id} */
export function getSuppliers(companyId: number) {
  return apiFetch<SupplierRecord[]>(`/api/v1/suppliers/${companyId}`)
}

/** GET /api/v1/suppliers/{supplier_id}/emissions */
export function getSupplierEmissions(supplierId: number) {
  return apiFetch<SupplierEmission>(`/api/v1/suppliers/${supplierId}/emissions`)
}

/** GET /api/v1/verify/entries */
export function getVerificationEntries() {
  return apiFetch<VerificationEntry[]>('/api/v1/verify/entries')
}

/** GET /api/v1/verify/validate */
export function validateVerification() {
  return apiFetch<VerificationResult>('/api/v1/verify/validate')
}

/** GET /api/v1/verify/summary/{company_id} */
export function getVerificationSummary(companyId: number) {
  return apiFetch<VerificationSummary>(`/api/v1/verify/summary/${companyId}`)
}

/** POST /api/v1/optimize */
export function runOptimization(request: OptimizationRequest) {
  return apiFetch<OptimizationResponse>('/api/v1/optimize', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** POST /api/v1/ai/explain */
export function getAIExplanation(request: AIExplanationRequest) {
  return apiFetch<AIExplanationResponse>('/api/v1/ai/explain', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** POST /api/v1/seed */
export function seedDemoData() {
  return apiFetch<SeedResponse>('/api/v1/seed', { method: 'POST' })
}
