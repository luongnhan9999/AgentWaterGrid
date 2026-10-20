#!/usr/bin/env python3
"""
Test Live Interaction on StudioNet for AgentWaterGrid:
Creates a live water-rights escrow policy and queries on-chain state.
"""

import os
import sys
import json
import time
from pathlib import Path
from genlayer_py import create_client, create_account, generate_private_key, studionet

PK = os.environ.get("DEPLOYER_PRIVATE_KEY", "0x1b807b1df022a40f872596b11565e6b6856547dc66996bd3d5a85b376ea3a0ef").strip()


def main():
    dep_file = Path(__file__).parent.parent / "deployment.json"
    if not dep_file.exists():
        print("[!] deployment.json not found.")
        return

    with open(dep_file, "r", encoding="utf-8") as f:
        dep_data = json.load(f)

    contract_addr = dep_data["contractAddress"]
    account = create_account(PK)
    client = create_client(chain=studionet, account=account)

    print(f"[+] Connected to StudioNet. Account: {account.address}")
    print(f"[+] Target Contract Address: {contract_addr}")

    # Check stats
    stats_raw = client.read_contract(address=contract_addr, function_name="get_stats", args=[])
    print(f"[+] Initial Stats: {stats_raw}")

    # Check balance and fund
    bal = client.get_balance(account.address)
    print(f"[+] Balance: {bal / 1e18} GEN")
    if bal < 2e18:
        print("[+] Requesting faucet funds...")
        try:
            client.fund_account(address=account.address, amount=100)
            print("[+] Funded 100 GEN successfully!")
        except Exception as e:
            print(f"[!] Faucet note: {e}")

    # Create live water escrow policy
    community_rep = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    print("\n[+] Creating Live Water License Escrow on-chain...")
    tx_hash = client.write_contract(
        address=contract_addr,
        function_name="create_water_license_escrow",
        args=[
            community_rep,
            "CENTRAL-VALLEY-AQUIFER-B4",
            150,
            500,
            60000
        ],
        value=1000000000000000000  # 1 GEN
    )
    print(f"[+] Policy Creation Tx: {tx_hash}")
    print("[+] Waiting for block confirmation...")
    receipt = client.wait_for_transaction_receipt(tx_hash)
    print(f"[+] Receipt status: {receipt.get('status')}")

    # Verify updated stats and policy
    stats_updated = client.read_contract(address=contract_addr, function_name="get_stats", args=[])
    print(f"[+] Updated Stats: {stats_updated}")

    policies_raw = client.read_contract(address=contract_addr, function_name="get_all_policies", args=[])
    print(f"[+] All Policies: {policies_raw}")


if __name__ == "__main__":
    main()
