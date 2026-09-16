"""
CarbonTrace Static Blockchain Reference Layer.

Provides static reference metadata, ABI definitions, and cryptographic anchoring
abstractions for the CarbonRetirement.sol smart-contract artifact.

IMPORTANT PROJECT CONSTRAINTS:
- No live blockchain deployment
- No wallet, gas, or RPC transactions
- No carbon credit retirement
- Purely static reference model for hackathon architecture demonstration
"""

from typing import Any

# Contract metadata and ABI for architectural reference
CONTRACT_NAME = "CarbonRetirement"
CONTRACT_VERSION = "1.0.0"
SOLIDITY_VERSION = "^0.8.20"

# Static reference ABI
STATIC_CONTRACT_ABI = [
    {
        "type": "event",
        "name": "CheckpointAnchored",
        "inputs": [
            {"name": "entryId", "type": "uint256", "indexed": True},
            {"name": "blockHash", "type": "bytes32", "indexed": True},
            {"name": "previousHash", "type": "bytes32", "indexed": False},
            {"name": "timestamp", "type": "uint256", "indexed": False},
            {"name": "isPrimary", "type": "bool", "indexed": False},
        ],
    },
    {
        "type": "function",
        "name": "anchorCheckpoint",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "entryId", "type": "uint256"},
            {"name": "dataHash", "type": "bytes32"},
            {"name": "blockHash", "type": "bytes32"},
            {"name": "previousHash", "type": "bytes32"},
            {"name": "isPrimary", "type": "bool"},
        ],
        "outputs": [],
    },
]


def get_contract_metadata() -> dict[str, Any]:
    """
    Returns static metadata describing the conceptual smart-contract architecture.
    """
    return {
        "contract_name": CONTRACT_NAME,
        "version": CONTRACT_VERSION,
        "solidity_version": SOLIDITY_VERSION,
        "is_live_deployment": False,
        "mode": "static_reference_prototype",
        "abi_events_count": 1,
        "abi_functions_count": 1,
        "anchoring_support": "SHA-256 Checkpoint Mapping",
    }
