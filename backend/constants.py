"""
CarbonTrace shared constants.

This file is the single source of truth for shared limits, thresholds,
status values, and system configuration.

Do not hard-code these values inside individual modules.
"""


# ============================================================
# VERIFICATION
# ============================================================

HASH_ALGORITHM = "sha256"

GENESIS_HASH = "0" * 64


# ============================================================
# DATA QUALITY / TRUST
# ============================================================

DATA_SOURCE_PRIMARY = "primary"
DATA_SOURCE_ESTIMATED = "estimated"

VERIFICATION_STATUS_VERIFIED = "verified"
VERIFICATION_STATUS_UNVERIFIED = "unverified"
VERIFICATION_STATUS_TAMPERED = "tampered"

THRESHOLD_FLAG_VARIANCE = 0.20


# ============================================================
# CARBON
# ============================================================

UNIT_KGCO2E = "kgCO2e"

MIN_ACTIVITY_QUANTITY = 0.0
MAX_ACTIVITY_QUANTITY = 1_000_000_000.0


# ============================================================
# EMISSION FACTORS & BENCHMARKS (CENTRALIZED REPOSITORY)
# Formula: emissions_kgco2e = activity_quantity * emission_factor
# ============================================================

# Standard units
UNIT_KWH = "kWh"
UNIT_TON_KM = "ton_km"
UNIT_TONS = "tons"
UNIT_KG = "kg"
UNIT_LITERS = "liters"

# Status for emission factor governance
FACTOR_STATUS_APPROVED = "approved"
FACTOR_STATUS_PENDING_APPROVAL = "pending_approved_source"

# Centralized dictionary of emission factors for deterministic calculation
# Values for baseline demo records correspond directly to verified baseline standards
# (e.g. CEA Grid Factor India, GLEC Framework, DEFRA secondary averages).
EMISSION_FACTORS: dict[str, dict[str, object]] = {
    # Scope 2 - Purchased Electricity (India Central Electricity Authority CO2 baseline)
    "electricity_consumption": {
        "activity_type": "electricity_consumption",
        "factor": 0.716,  # 0.716 kgCO2e per kWh
        "unit": UNIT_KWH,
        "factor_unit": f"{UNIT_KGCO2E}/{UNIT_KWH}",
        "scope": "Scope 2",
        "source": "CEA India CO2 Baseline Database v19 / Tata Power benchmark",
        "status": FACTOR_STATUS_APPROVED,
    },
    "grid_electricity": {
        "activity_type": "grid_electricity",
        "factor": 0.72,
        "unit": UNIT_KWH,
        "factor_unit": f"{UNIT_KGCO2E}/{UNIT_KWH}",
        "scope": "Scope 2",
        "source": "CEA India Grid Electricity Baseline",
        "status": FACTOR_STATUS_APPROVED,
    },
    "supplier_electricity": {
        "activity_type": "supplier_electricity",
        "factor": 0.72,
        "unit": UNIT_KWH,
        "factor_unit": f"{UNIT_KGCO2E}/{UNIT_KWH}",
        "scope": "Scope 3",
        "source": "Supplier Primary Electricity Disclosure",
        "status": FACTOR_STATUS_APPROVED,
    },
    # Scope 1 - Mobile Fleet / Diesel
    "diesel_fleet": {
        "activity_type": "diesel_fleet",
        "factor": 2.68,
        "unit": "litres",
        "factor_unit": f"{UNIT_KGCO2E}/litre",
        "scope": "Scope 1",
        "source": "IPCC / DEFRA Diesel Fuel Standard",
        "status": FACTOR_STATUS_APPROVED,
    },
    # Scope 1 - Industrial Fuel / Natural Gas
    "natural_gas": {
        "activity_type": "natural_gas",
        "factor": 2.02,
        "unit": "m3",
        "factor_unit": f"{UNIT_KGCO2E}/m3",
        "scope": "Scope 1",
        "source": "IPCC Natural Gas Combustion Standard",
        "status": FACTOR_STATUS_APPROVED,
    },
    # Scope 3 Category 4 - Upstream Freight / Inbound Logistics (GLEC Framework Average)
    "inbound_logistics": {
        "activity_type": "inbound_logistics",
        "factor": 0.115,  # 4830 kgCO2e / 42000 ton_km = 0.115 kgCO2e per ton_km
        "unit": UNIT_TON_KM,
        "factor_unit": f"{UNIT_KGCO2E}/{UNIT_TON_KM}",
        "scope": "Scope 3",
        "source": "GLEC Framework Average (Diesel road transport)",
        "status": FACTOR_STATUS_APPROVED,
    },
    "freight_transport": {
        "activity_type": "freight_transport",
        "factor": 0.20,
        "unit": "tonne-km",
        "factor_unit": f"{UNIT_KGCO2E}/tonne-km",
        "scope": "Scope 3",
        "source": "GLEC Logistics Average",
        "status": FACTOR_STATUS_APPROVED,
    },
    "business_travel": {
        "activity_type": "business_travel",
        "factor": 0.14,
        "unit": "passenger-km",
        "factor_unit": f"{UNIT_KGCO2E}/passenger-km",
        "scope": "Scope 3",
        "source": "DEFRA Air Travel Standard",
        "status": FACTOR_STATUS_APPROVED,
    },
    # Scope 3 Category 1 - Raw Materials: Hot Rolled Coil Steel (Primary verified supplier factor)
    "raw_materials_steel": {
        "activity_type": "raw_materials_steel",
        "factor": 1820.0,  # 1.82 tCO2e/t = 1820 kgCO2e per ton (450 tons = 819,000 kgCO2e)
        "unit": UNIT_TONS,
        "factor_unit": f"{UNIT_KGCO2E}/{UNIT_TONS}",
        "scope": "Scope 3",
        "source": "JSW Steel Primary Supplier EPD / Baseline Record",
        "status": FACTOR_STATUS_APPROVED,
    },
    # Scope 3 Category 1 - Packaging: Recycled Kraft Board (DEFRA / secondary industry benchmark)
    "packaging_corrugated": {
        "activity_type": "packaging_corrugated",
        "factor": 0.94,  # 0.94 kgCO2e per kg (15,000 kg = 14,100 kgCO2e)
        "unit": UNIT_KG,
        "factor_unit": f"{UNIT_KGCO2E}/{UNIT_KG}",
        "scope": "Scope 3",
        "source": "DEFRA / Industry Secondary Benchmark Average",
        "status": FACTOR_STATUS_APPROVED,
    },
    # Scope 1 - Stationary Combustion (Diesel Genset) - explicit placeholder awaiting approved factor
    "stationary_combustion_diesel": {
        "activity_type": "stationary_combustion_diesel",
        "factor": None,  # Requires approved factor source (e.g. IPCC 2006 / MoEFCC)
        "unit": UNIT_LITERS,
        "factor_unit": f"{UNIT_KGCO2E}/{UNIT_LITERS}",
        "scope": "Scope 1",
        "source": "PENDING_APPROVED_FACTOR: Requires official MoEFCC/IPCC guideline approval",
        "status": FACTOR_STATUS_PENDING_APPROVAL,
    },
    # Scope 1 - Mobile Fleet (Petrol) - explicit placeholder awaiting approved factor
    "mobile_combustion_petrol": {
        "activity_type": "mobile_combustion_petrol",
        "factor": None,
        "unit": UNIT_LITERS,
        "factor_unit": f"{UNIT_KGCO2E}/{UNIT_LITERS}",
        "scope": "Scope 1",
        "source": "PENDING_APPROVED_FACTOR: Requires official MoEFCC/IPCC guideline approval",
        "status": FACTOR_STATUS_PENDING_APPROVAL,
    },
}


# ============================================================
# OPTIMIZATION
# ============================================================

MIN_REDUCTION_PERCENTAGE = 0.0
MAX_REDUCTION_PERCENTAGE = 100.0

MIN_BUDGET_INR = 0.0


# ============================================================
# API
# ============================================================

API_VERSION = "v1"

API_PREFIX = f"/api/{API_VERSION}"


# ============================================================
# API ROUTES
# ============================================================

CARBON_PREFIX = "/carbon"
SUPPLIERS_PREFIX = "/suppliers"
VERIFICATION_PREFIX = "/verify"
OPTIMIZATION_PREFIX = "/optimize"
REPORT_PREFIX = "/report"
AI_PREFIX = "/ai"


# ============================================================
# ERROR CODES
# ============================================================

ERROR_NOT_FOUND = "NOT_FOUND"
ERROR_INVALID_DATA = "INVALID_DATA"
ERROR_VALIDATION_FAILED = "VALIDATION_FAILED"

ERROR_SUPPLIER_NOT_FOUND = "SUPPLIER_NOT_FOUND"
ERROR_COMPANY_NOT_FOUND = "COMPANY_NOT_FOUND"
ERROR_ENTRY_NOT_FOUND = "ENTRY_NOT_FOUND"

ERROR_VERIFICATION_FAILED = "VERIFICATION_FAILED"
ERROR_TAMPER_DETECTED = "TAMPER_DETECTED"
ERROR_BLOCKCHAIN_ERROR = "BLOCKCHAIN_ERROR"


# ============================================================
# SYSTEM
# ============================================================

SERVICE_NAME = "CarbonTrace API"