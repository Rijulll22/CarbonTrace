"""
Lightweight test script to verify Person 2 Hash-Chain Ledger & Trust Layer.
"""

import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

import verification
from constants import GENESIS_HASH


def run_checks():
    print("=" * 60)
    print("RUNNING PERSON 2 VERIFICATION CHECKS")
    print("=" * 60)

    # 1. Test clean chain
    ledger = verification.VerificationLedger()
    val1 = ledger.validate_chain()
    print(f"[Check 1] Clean Chain Validation: is_verified={val1.is_verified}, checked={val1.checked_entries}")
    assert val1.is_verified is True, "Clean chain should be valid"
    assert val1.checked_entries == 4, f"Expected 4 initial seeded entries, got {val1.checked_entries}"
    assert len(val1.invalid_entries) == 0

    # 2. Check Genesis link
    entries = ledger.list_entries()
    print(f"[Check 2] Genesis block previous_hash: {entries[0]['previous_hash']}")
    assert entries[0]["previous_hash"] == GENESIS_HASH

    # 3. Check chain links
    for i in range(1, len(entries)):
        prev_b = entries[i - 1]
        curr_b = entries[i]
        assert curr_b["previous_hash"] == prev_b["block_hash"], f"Block {i} link mismatch!"
    print("[Check 3] All sequential block hashes correctly link to previous_hash.")

    # 4. Add a new entry
    new_entry = ledger.add_entry(
        entry_type="commute_ev_fleet",
        source_id=105,
        data_hash=verification.compute_data_hash({"distance_km": 15000, "ef": 0.05}),
        is_primary=True,
        metadata={"company_id": 1, "fleet": "Electric Shuttle Bus"},
    )
    print(f"[Check 4] Added Entry #{new_entry['entry_id']} (Primary={new_entry['is_primary']})")
    assert new_entry["entry_id"] == 5
    assert new_entry["previous_hash"] == entries[-1]["block_hash"]
    val2 = ledger.validate_chain()
    assert val2.is_verified is True
    assert val2.checked_entries == 5
    print(f"[Check 4.1] Extended Chain Validation: is_verified={val2.is_verified}, checked={val2.checked_entries}")

    # 5. Summary metrics
    summary = ledger.get_summary(company_id=1)
    print(f"[Check 5] Summary for Company 1: Total={summary.total_entries}, Verified={summary.verified_entries}, Primary={summary.primary_entries}, Estimated={summary.estimated_entries}, Verification %={summary.verification_percentage}%")
    assert summary.total_entries == 5
    assert summary.primary_entries == 3
    assert summary.estimated_entries == 2
    assert summary.verified_entries == 5

    # 6. Tamper simulation on Entry 2
    print("\n--- SIMULATING TAMPER ON ENTRY 2 ---")
    tamper_res = ledger.tamper_entry(entry_id=2)
    print(f"[Check 6] Tamper result: {tamper_res['message']}")
    
    val3 = ledger.validate_chain()
    print(f"[Check 6.1] Validation after tamper: is_verified={val3.is_verified}")
    print(f"[Check 6.2] Detected invalid entries: {val3.invalid_entries}")
    print(f"[Check 6.3] Diagnostic message: {val3.message}")
    assert val3.is_verified is False, "Tampered chain must fail validation"
    assert 2 in val3.invalid_entries, "Entry 2 must be flagged as invalid"

    # 7. Summary after tamper
    summary_tampered = ledger.get_summary(company_id=1)
    print(f"[Check 7] Summary after tamper: Flagged={summary_tampered.flagged_entries}, Verification %={summary_tampered.verification_percentage}%")
    assert summary_tampered.flagged_entries >= 1

    # 8. Reset ledger
    reset_res = ledger.reset_ledger()
    print(f"\n[Check 8] Reset ledger: {reset_res['message']}")
    val4 = ledger.validate_chain()
    assert val4.is_verified is True
    print(f"[Check 8.1] Post-reset validation: is_verified={val4.is_verified}, checked={val4.checked_entries}")

    print("\n" + "=" * 60)
    print("ALL PERSON 2 CHECKS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    run_checks()
