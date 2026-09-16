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