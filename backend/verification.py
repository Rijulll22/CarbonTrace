"""
CarbonTrace Verification & Trust Layer.

Implements a deterministic SHA-256 hash-chain ledger for emissions data integrity,
tamper detection, and primary vs. estimated data classification.

Aligned with GHG Protocol Scope 3 guidance and SEBI BRSR core principles:
- Tamper-evident hash chaining (Block N depends on Block N-1)
- Explicit primary vs. estimated data tagging
- Full chain validation and broken-link identification
- Static demo tampering simulation for live pitch presentations
"""

import hashlib
import json
import threading
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from constants import (
    ERROR_ENTRY_NOT_FOUND,
    ERROR_TAMPER_DETECTED,
    ERROR_VERIFICATION_FAILED,
    GENESIS_HASH,
    HASH_ALGORITHM,
    VERIFICATION_PREFIX,
    VERIFICATION_STATUS_TAMPERED,
    VERIFICATION_STATUS_UNVERIFIED,
    VERIFICATION_STATUS_VERIFIED,
)
from schemas import (
    APIError,
    VerificationEntryCreate,
    VerificationEntryResponse,
    VerificationResult,
    VerificationSummaryResponse,
)

router = APIRouter(tags=["Verification"])


# ============================================================
# DETERMINISTIC HASHING UTILITIES
# ============================================================

def canonical_json(data: Any) -> str:
    """
    Produce a deterministic, canonical JSON string representation.
    Ensures identical keys and separators across runs without whitespace variance.
    """
    return json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)


def compute_sha256(content: str) -> str:
    """Compute standard SHA-256 hexadecimal digest from string."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def compute_data_hash(payload: dict[str, Any] | str) -> str:
    """
    Calculate deterministic SHA-256 hash for arbitrary activity or supplier data payload.
    """
    if isinstance(payload, str):
        return compute_sha256(payload)
    return compute_sha256(canonical_json(payload))


def compute_block_hash(
    entry_id: int,
    entry_type: str,
    source_id: int,
    data_hash: str,
    previous_hash: str,
    is_primary: bool,
    created_at: str,
    metadata: dict[str, Any] | None = None,
) -> str:
    """
    Calculate the deterministic block hash for a ledger entry.
    The hash is cryptographically bound to the previous_hash and entry contents.
    """
    payload = {
        "created_at": created_at,
        "data_hash": data_hash,
        "entry_id": entry_id,
        "entry_type": entry_type,
        "is_primary": is_primary,
        "metadata": metadata or {},
        "previous_hash": previous_hash,
        "source_id": source_id,
    }
    return compute_sha256(canonical_json(payload))


# ============================================================
# IN-MEMORY THREAD-SAFE HASH-CHAIN LEDGER ENGINE
# ============================================================

class VerificationLedger:
    """
    Thread-safe in-memory SHA-256 Hash-Chain Ledger.
    Provides verifiable append-only ledger functionality with tamper-detection.
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._entries: list[dict[str, Any]] = []
        self._entry_counter: int = 0
        self._seed_default_chain()

    def _seed_default_chain(self) -> None:
        """Seed initial demo blocks representing baseline Scope 3 emissions entries."""
        with self._lock:
            self._entries.clear()
            self._entry_counter = 0

            # Demo entries representing realistic BRSR supply chain activities
            demo_records = [
                {
                    "entry_type": "electricity_consumption",
                    "source_id": 101,
                    "company_id": 1,
                    "is_primary": True,
                    "data": {
                        "facility": "Plant Alpha - Mumbai",
                        "units_kwh": 125000,
                        "grid_emission_factor": 0.716,
                        "emissions_kgco2e": 89500.0,
                    },
                    "metadata": {
                        "reporting_period": "FY2025-Q1",
                        "supplier_name": "Tata Power Grid Direct",
                        "evidence_doc": "INV-2025-0042.pdf",
                    },
                },
                {
                    "entry_type": "inbound_logistics",
                    "source_id": 102,
                    "company_id": 1,
                    "is_primary": False,
                    "data": {
                        "route": "Nhava Sheva to Pune",
                        "ton_km": 42000,
                        "mode": "diesel_truck",
                        "emissions_kgco2e": 4830.0,
                    },
                    "metadata": {
                        "reporting_period": "FY2025-Q1",
                        "supplier_name": "Mahindra Logistics (Tier 2)",
                        "estimation_method": "GLEC Framework Average",
                    },
                },
                {
                    "entry_type": "raw_materials_steel",
                    "source_id": 103,
                    "company_id": 1,
                    "is_primary": True,
                    "data": {
                        "material": "Hot Rolled Coil Steel",
                        "quantity_tons": 450,
                        "supplier_ef": 1.82,
                        "emissions_kgco2e": 819000.0,
                    },
                    "metadata": {
                        "reporting_period": "FY2025-Q1",
                        "supplier_name": "JSW Steel Certified Batch",
                        "batch_id": "JSW-HRC-2025-998",
                    },
                },
                {
                    "entry_type": "packaging_corrugated",
                    "source_id": 104,
                    "company_id": 1,
                    "is_primary": False,
                    "data": {
                        "material": "Recycled Kraft Board",
                        "weight_kg": 15000,
                        "industry_ef": 0.94,
                        "emissions_kgco2e": 14100.0,
                    },
                    "metadata": {
                        "reporting_period": "FY2025-Q1",
                        "supplier_name": "Apex Packaging Ltd",
                        "estimation_method": "DEFRA Secondary Average",
                    },
                },
            ]

            for record in demo_records:
                d_hash = compute_data_hash(record["data"])
                self._append_entry_internal(
                    entry_type=record["entry_type"],
                    source_id=record["source_id"],
                    data_hash=d_hash,
                    is_primary=record["is_primary"],
                    metadata={
                        **record["metadata"],
                        "company_id": record["company_id"],
                    },
                    created_at=datetime.now(timezone.utc).isoformat(),
                )

    def _append_entry_internal(
        self,
        entry_type: str,
        source_id: int,
        data_hash: str,
        is_primary: bool,
        metadata: dict[str, Any],
        created_at: str,
    ) -> dict[str, Any]:
        """Internal append without locking (caller must hold self._lock)."""
        self._entry_counter += 1
        entry_id = self._entry_counter

        # Calculate previous hash link
        if not self._entries:
            previous_hash = GENESIS_HASH
        else:
            previous_hash = self._entries[-1]["block_hash"]

        block_hash = compute_block_hash(
            entry_id=entry_id,
            entry_type=entry_type,
            source_id=source_id,
            data_hash=data_hash,
            previous_hash=previous_hash,
            is_primary=is_primary,
            created_at=created_at,
            metadata=metadata,
        )

        entry = {
            "entry_id": entry_id,
            "entry_type": entry_type,
            "source_id": source_id,
            "data_hash": data_hash,
            "previous_hash": previous_hash,
            "block_hash": block_hash,
            "is_primary": is_primary,
            "is_verified": True,
            "metadata": metadata,
            "created_at": created_at,
        }
        self._entries.append(entry)
        return entry

    def add_entry(
        self,
        entry_type: str,
        source_id: int,
        data_hash: str,
        is_primary: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Append a new verified entry to the hash-chain ledger."""
        with self._lock:
            created_at = datetime.now(timezone.utc).isoformat()
            return self._append_entry_internal(
                entry_type=entry_type,
                source_id=source_id,
                data_hash=data_hash,
                is_primary=is_primary,
                metadata=metadata or {},
                created_at=created_at,
            )

    def list_entries(self, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        """List ledger entries with pagination support."""
        with self._lock:
            return [dict(e) for e in self._entries[offset : offset + limit]]

    def get_entry_by_id(self, entry_id: int) -> dict[str, Any] | None:
        """Find a single ledger entry by its entry_id."""
        with self._lock:
            for entry in self._entries:
                if entry["entry_id"] == entry_id:
                    return dict(entry)
            return None

    def validate_chain(self) -> VerificationResult:
        """
        Validate full cryptographic hash-chain integrity.
        Verifies:
        1. Genesis block has previous_hash == GENESIS_HASH.
        2. Recalculated block_hash strictly matches recorded block_hash.
        3. Block N's previous_hash strictly matches Block N-1's block_hash.
        Returns structured diagnostic details with any tampered entry IDs.
        """
        with self._lock:
            if not self._entries:
                return VerificationResult(
                    is_verified=True,
                    checked_entries=0,
                    invalid_entries=[],
                    message="Ledger is empty. Genesis state ready.",
                )

            invalid_entries: list[int] = []
            break_reasons: list[str] = []

            for i, entry in enumerate(self._entries):
                entry_id = entry["entry_id"]
                recorded_block_hash = entry["block_hash"]
                recorded_prev_hash = entry["previous_hash"]

                # Expected previous hash
                if i == 0:
                    expected_prev = GENESIS_HASH
                else:
                    expected_prev = self._entries[i - 1]["block_hash"]

                # 1. Check link to previous block
                if recorded_prev_hash != expected_prev:
                    invalid_entries.append(entry_id)
                    break_reasons.append(
                        f"Entry #{entry_id}: Broken previous_hash link. "
                        f"Expected '{expected_prev[:12]}...', found '{recorded_prev[:12]}...'."
                    )
                    continue

                # 2. Recalculate block hash from content
                recalculated_hash = compute_block_hash(
                    entry_id=entry_id,
                    entry_type=entry["entry_type"],
                    source_id=entry["source_id"],
                    data_hash=entry["data_hash"],
                    previous_hash=recorded_prev_hash,
                    is_primary=entry["is_primary"],
                    created_at=entry["created_at"],
                    metadata=entry.get("metadata", {}),
                )

                if recalculated_hash != recorded_block_hash:
                    invalid_entries.append(entry_id)
                    break_reasons.append(
                        f"Entry #{entry_id}: Hash mismatch (data tampered). "
                        f"Stored '{recorded_block_hash[:12]}...', calculated '{recalculated_hash[:12]}...'."
                    )

            if invalid_entries:
                return VerificationResult(
                    is_verified=False,
                    checked_entries=len(self._entries),
                    invalid_entries=list(dict.fromkeys(invalid_entries)),
                    message=" | ".join(break_reasons),
                )

            return VerificationResult(
                is_verified=True,
                checked_entries=len(self._entries),
                invalid_entries=[],
                message=f"All {len(self._entries)} ledger entries verified successfully. Hash-chain integrity intact.",
            )

    def get_summary(self, company_id: int) -> VerificationSummaryResponse:
        """
        Compute trust summary and primary vs estimated metrics for a company.
        """
        with self._lock:
            # Filter entries belonging to company (or all if company_id matches)
            matching = [
                e for e in self._entries
                if e.get("metadata", {}).get("company_id", company_id) == company_id
            ]
            if not matching:
                matching = list(self._entries)

            validation = self.validate_chain()
            invalid_set = set(validation.invalid_entries)

            total = len(matching)
            verified = sum(1 for e in matching if e["entry_id"] not in invalid_set)
            primary = sum(1 for e in matching if e["is_primary"])
            estimated = total - primary
            flagged = len(invalid_set)

            pct = (verified / total * 100.0) if total > 0 else 100.0

            return VerificationSummaryResponse(
                company_id=company_id,
                total_entries=total,
                verified_entries=verified,
                primary_entries=primary,
                estimated_entries=estimated,
                flagged_entries=flagged,
                verification_percentage=round(pct, 2),
            )

    def tamper_entry(self, entry_id: int, fake_data_hash: str | None = None) -> dict[str, Any]:
        """
        Simulate data tampering for demo/pitch verification failure test.
        Modifies data_hash or metadata of a historical block without re-hashing the chain,
        guaranteeing a cryptographic break at and downstream of that entry.
        """
        with self._lock:
            for entry in self._entries:
                if entry["entry_id"] == entry_id:
                    new_hash = fake_data_hash or compute_sha256(f"tampered_payload_{datetime.now(timezone.utc).timestamp()}")
                    entry["data_hash"] = new_hash
                    entry["is_verified"] = False
                    return {
                        "status": "tampered",
                        "entry_id": entry_id,
                        "tampered_data_hash": new_hash,
                        "message": f"Entry #{entry_id} data_hash was modified. Hash-chain validation will now fail.",
                    }
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Entry with ID {entry_id} not found in verification ledger.",
            )

    def reset_ledger(self) -> dict[str, Any]:
        """Reset the ledger back to clean, verified demo seed state."""
        with self._lock:
            self._seed_default_chain()
            return {
                "status": "reset",
                "total_entries": len(self._entries),
                "message": "Verification ledger reset to verified seed state.",
            }


# Global ledger singleton
ledger = VerificationLedger()


# ============================================================
# API ROUTE ENDPOINTS
# ============================================================

@router.get(
    "/entries",
    response_model=list[VerificationEntryResponse],
    summary="List verification ledger entries",
    description="Retrieve block-explorer style ledger entries with cryptographic link hashes.",
)
def list_verification_entries(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[VerificationEntryResponse]:
    entries = ledger.list_entries(limit=limit, offset=offset)
    validation = ledger.validate_chain()
    invalid_set = set(validation.invalid_entries)

    return [
        VerificationEntryResponse(
            entry_id=e["entry_id"],
            entry_type=e["entry_type"],
            source_id=e["source_id"],
            data_hash=e["data_hash"],
            previous_hash=e["previous_hash"],
            block_hash=e["block_hash"],
            is_primary=e["is_primary"],
            is_verified=e["entry_id"] not in invalid_set,
            created_at=e["created_at"],
        )
        for e in entries
    ]


@router.get(
    "/entries/{entry_id}",
    response_model=VerificationEntryResponse,
    responses={404: {"model": APIError}},
    summary="Get single verification entry",
    description="Get detailed cryptographic block information for a specific ledger entry.",
)
def get_verification_entry(entry_id: int) -> VerificationEntryResponse:
    entry = ledger.get_entry_by_id(entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verification entry #{entry_id} was not found.",
        )
    validation = ledger.validate_chain()
    is_valid = entry_id not in set(validation.invalid_entries)

    return VerificationEntryResponse(
        entry_id=entry["entry_id"],
        entry_type=entry["entry_type"],
        source_id=entry["source_id"],
        data_hash=entry["data_hash"],
        previous_hash=entry["previous_hash"],
        block_hash=entry["block_hash"],
        is_primary=entry["is_primary"],
        is_verified=is_valid,
        created_at=entry["created_at"],
    )


@router.post(
    "/entries",
    response_model=VerificationEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record verified emissions entry",
    description="Appends a new verified calculation or supplier entry to the SHA-256 hash-chain.",
)
def create_verification_entry(
    payload: VerificationEntryCreate,
) -> VerificationEntryResponse:
    created = ledger.add_entry(
        entry_type=payload.entry_type,
        source_id=payload.source_id,
        data_hash=payload.data_hash,
        is_primary=payload.is_primary,
        metadata=payload.metadata,
    )
    return VerificationEntryResponse(
        entry_id=created["entry_id"],
        entry_type=created["entry_type"],
        source_id=created["source_id"],
        data_hash=created["data_hash"],
        previous_hash=created["previous_hash"],
        block_hash=created["block_hash"],
        is_primary=created["is_primary"],
        is_verified=True,
        created_at=created["created_at"],
    )


@router.get(
    "/validate",
    response_model=VerificationResult,
    summary="Validate full hash-chain integrity",
    description="Cryptographically verifies every block from genesis to head, identifying tampered or broken entries.",
)
def validate_ledger_integrity() -> VerificationResult:
    return ledger.validate_chain()


@router.get(
    "/summary/{company_id}",
    response_model=VerificationSummaryResponse,
    summary="Get verification trust summary",
    description="Provides trust percentage, primary vs. estimated data counts, and flagged entries for BRSR reporting.",
)
def get_company_verification_summary(company_id: int) -> VerificationSummaryResponse:
    return ledger.get_summary(company_id=company_id)


# ============================================================
# INTERACTIVE DEMO ENDPOINTS (FOR LIVE HACKATHON PITCH)
# ============================================================

@router.post(
    "/tamper/{entry_id}",
    summary="[DEMO] Simulate historical data tampering",
    description="Artificially alters a block's payload to demonstrate live cryptographic chain breakage.",
)
def demo_tamper_entry(entry_id: int) -> dict[str, Any]:
    return ledger.tamper_entry(entry_id=entry_id)


@router.post(
    "/reset",
    summary="[DEMO] Reset verification ledger to clean seed state",
    description="Restores the ledger to a verified, unbroken baseline state.",
)
def demo_reset_ledger() -> dict[str, Any]:
    return ledger.reset_ledger()
