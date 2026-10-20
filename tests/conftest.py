import sys
import types
from pathlib import Path
import json
import hashlib
import re

# Mock genlayer module if not loaded natively
if 'genlayer' not in sys.modules:
    gl_mod = types.ModuleType('genlayer')

    class _Address:
        def __init__(self, val=""):
            if isinstance(val, int):
                self.as_hex = f"0x{val:040x}".lower()
            else:
                self.as_hex = str(val).lower()
            try:
                clean_hex = self.as_hex.replace("0x", "")
                self.as_bytes = bytes.fromhex(clean_hex)
            except Exception:
                self.as_bytes = b"\x00" * 20

        def __str__(self):
            return self.as_hex

        def __repr__(self):
            return self.as_hex

        def __eq__(self, other):
            return str(self).lower() == str(other).lower()

    gl_mod.Address = _Address
    gl_mod.u8 = int
    gl_mod.u32 = int
    gl_mod.u64 = int
    gl_mod.u256 = int
    gl_mod.bigint = int
    gl_mod.TreeMap = dict
    gl_mod.DynArray = list
    gl_mod.allow_storage = lambda cls: cls

    class _GL:
        pass

    gl_mod.gl = _GL()

    class _Contract:
        pass

    gl_mod.Contract = _Contract
    sys.modules['genlayer'] = gl_mod

import pytest

CANARY_TOKEN = "CANARY_AGENT_WATER_GRID_V1"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
SECONDS_PER_BLOCK = 3
COOLING_OFF_BLOCKS = 24
COOLING_OFF_SECONDS = COOLING_OFF_BLOCKS * SECONDS_PER_BLOCK  # 72 seconds
DEFAULT_WATER_POLICY_SECONDS = 86400 * 30                     # 30 days

STATUS_POLICY_ACTIVE = 0
STATUS_DEPLETION_ALERT = 1
STATUS_AWAITING_PAYOUT = 2
STATUS_SETTLED_RELIEF_PAID = 3
STATUS_SETTLED_PARTIAL = 4
STATUS_SETTLED_COMPLIANT = 5
STATUS_DISPUTED = 6
STATUS_EXPIRED_RECLAIMED = 7
STATUS_UNRESOLVED = 8

ACCREDITED_HYDROLOGICAL_SOURCES = [
    "waterdata.usgs.gov",
    "usgs.gov",
    "land.copernicus.eu",
    "copernicus.eu",
    "grdc.bafg.de",
    "water.noaa.gov",
    "environment.data.gov.uk",
    "bafg.de",
]


def _is_accredited_hydrological_source(url: str) -> bool:
    clean = str(url).strip().lower()
    if not (clean.startswith("http://") or clean.startswith("https://")):
        return False
    try:
        no_proto = clean.split("://", 1)[1]
        host = no_proto.split("/", 1)[0].split(":", 1)[0]
        for domain in ACCREDITED_HYDROLOGICAL_SOURCES:
            if host == domain or host.endswith("." + domain):
                return True
    except Exception:
        return False
    return False


class _MockTxResult:
    def __init__(self, return_value):
        self.return_value = return_value

    def __str__(self):
        return str(self.return_value)

    def __int__(self):
        return int(self.return_value)

    def __eq__(self, other):
        if isinstance(other, _MockTxResult):
            return self.return_value == other.return_value
        return self.return_value == other


class _MockCallResult:
    def __init__(self, val):
        self._val = val

    def call(self):
        return self._val


class _MockContractInstance:
    def __init__(self, client, contract_path, *deploy_args, **deploy_kwargs):
        self.client = client
        self.contract_path = contract_path
        self.caller = client.accounts[0]
        self.owner = client.accounts[0]
        args_list = deploy_kwargs.get("args") or (deploy_args[0] if deploy_args else None)
        if args_list and len(args_list) > 0 and args_list[0] is not None:
            raw_own = args_list[0]
            if isinstance(raw_own, int):
                self.owner = f"0x{raw_own:040x}".lower()
            else:
                self.owner = str(raw_own).lower()
        self.policies = {}
        self.policy_ids = []
        self.policy_counter = 0
        self.total_water_locked = 0
        self.total_policies_settled = 0
        self.claimable_balances = {}
        self.simulated_time = 1760000000

    def connect(self, account):
        self.caller = str(account).lower()
        return self

    def set_time(self, t):
        self.simulated_time = t

    def create_water_license_escrow(self, args, value=0):
        community_rep = str(args[0]).lower().strip()
        basin_id = str(args[1]).strip()
        drawdown_thresh = int(args[2])
        salinity_thresh = int(args[3])
        dur_blocks = int(args[4]) if len(args) > 4 else 6000

        if int(value) <= 0:
            raise Exception("Water rights escrow deposit must be greater than 0 GEN.")
        if len(basin_id) < 4:
            raise Exception("Valid aquifer basin/wellhead ID required.")
        if self.caller == community_rep:
            raise Exception("Enterprise cannot designate themselves as community beneficiary.")

        dur_secs = dur_blocks * SECONDS_PER_BLOCK if dur_blocks > 0 else DEFAULT_WATER_POLICY_SECONDS
        self.policy_counter += 1
        pid = str(self.policy_counter)
        exp = self.simulated_time + dur_secs

        policy = {
            "policy_id": pid,
            "enterprise": self.caller,
            "community_rep": community_rep,
            "dispute_initiator": ZERO_ADDRESS,
            "escrow_amount": str(value),
            "dispute_bond": "0",
            "aquifer_basin_id": basin_id,
            "max_tolerable_drawdown_m": drawdown_thresh,
            "max_salinity_tds_ppm": salinity_thresh,
            "hydrology_feed_url": "",
            "evidence_hash": "",
            "status": STATUS_POLICY_ACTIVE,
            "verdict": "PENDING",
            "original_verdict": "PENDING",
            "reason": "Water-rights policy active. Monitored for aquifer drawdown and salinity intrusion.",
            "confidence": 0,
            "measured_drawdown_cm": 0,
            "measured_salinity_ppm": 0,
            "created_at_time": str(self.simulated_time),
            "expires_at_time": str(exp),
            "audit_completed_time": "0",
            "supplemental_evidence_url": "",
            "appeal_prior_verdict": "",
            "created_at_block": str(self.simulated_time),
            "expires_at_block": str(exp),
            "audit_completed_block": "0",
        }
        self.policies[pid] = policy
        self.policy_ids.append(pid)
        self.total_water_locked += int(value)
        return _MockTxResult(pid)

    def trigger_depletion_claim(self, args):
        pid = str(args[0]).strip()
        url = str(args[1]).strip()

        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = self.policies[pid]

        if p["status"] not in (STATUS_POLICY_ACTIVE, STATUS_UNRESOLVED):
            raise Exception("Policy is not in an active or retryable status.")
        if self.caller != p["community_rep"]:
            raise Exception("Role Violation: Only the registered community representative can file a depletion alert.")
        if not _is_accredited_hydrological_source(url):
            raise Exception("Telemetry unauthenticated: Must originate from an accredited water monitoring authority (USGS, Copernicus, GRDC, NOAA).")
        if self.simulated_time > int(p["expires_at_time"]):
            raise Exception("Policy coverage duration has expired.")

        p["hydrology_feed_url"] = url
        p["status"] = STATUS_DEPLETION_ALERT
        p["reason"] = "Hydrological depletion alert filed. Ready for on-chain AI Tribunal verification."
        return _MockTxResult(True)

    def adjudicate_water_drawdown(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = self.policies[pid]

        if p["status"] not in (STATUS_DEPLETION_ALERT, STATUS_UNRESOLVED):
            raise Exception("Policy is not awaiting depletion adjudication.")
        if self.caller not in (p["enterprise"], p["community_rep"], self.owner):
            raise Exception("Permission Denied: Only enterprise, community rep, or owner can trigger adjudication.")

        mocks = getattr(self.client.provider, "installed_mocks", {})
        web_mocks = mocks.get("web_mocks", {})
        llm_mocks = mocks.get("llm_mocks", {})

        url = p["hydrology_feed_url"]
        web_res = web_mocks.get(url, {})
        raw_feed = web_res.get("body", "")

        if not raw_feed:
            p["verdict"] = "UNRESOLVED_FETCH_FAILED"
            p["status"] = STATUS_UNRESOLVED
            p["reason"] = "Hydrological sensor telemetry endpoint unreachable or empty."
            p["evidence_hash"] = "0" * 64
            p["audit_completed_time"] = "0"
            return _MockTxResult(True)

        ev_hash = hashlib.sha256(raw_feed.encode("utf-8")).hexdigest()
        p["evidence_hash"] = ev_hash

        mock_reply = None
        for pattern, reply in llm_mocks.items():
            if pattern == ".*" or re.search(pattern, url):
                mock_reply = reply
                break

        if not mock_reply:
            mock_reply = json.dumps({
                "canary": CANARY_TOKEN,
                "verdict": "AQUIFER_DEPLETION_CONFIRMED",
                "confidence": 95,
                "measured_drawdown_cm": 185,
                "measured_salinity_ppm": 420,
                "reason": "Severe piezometric head drawdown detected. Critical threshold breached."
            })

        try:
            parsed = json.loads(mock_reply)
        except Exception:
            p["verdict"] = "UNRESOLVED_PARSE_FAILED"
            p["status"] = STATUS_UNRESOLVED
            p["reason"] = "AI validator parsing failed or malformed JSON returned."
            return _MockTxResult(True)

        if parsed.get("canary") != CANARY_TOKEN:
            p["verdict"] = "UNRESOLVED_CANARY_FAILED"
            p["status"] = STATUS_UNRESOLVED
            p["reason"] = "Security canary mismatch detected in jury output."
            return _MockTxResult(True)

        v_raw = str(parsed.get("verdict", "")).upper().strip()
        if v_raw not in {"AQUIFER_DEPLETION_CONFIRMED", "PARTIAL_DRAWDOWN_PENALTY", "AQUIFER_COMPLIANT_CLEAN"}:
            p["verdict"] = "UNRESOLVED_PARSE_FAILED"
            p["status"] = STATUS_UNRESOLVED
            p["reason"] = f"Unsupported verdict '{v_raw}' returned."
            return _MockTxResult(True)

        p["verdict"] = v_raw
        p["original_verdict"] = v_raw
        p["confidence"] = int(parsed.get("confidence", 85))
        p["measured_drawdown_cm"] = int(parsed.get("measured_drawdown_cm", 0))
        p["measured_salinity_ppm"] = int(parsed.get("measured_salinity_ppm", 0))
        p["reason"] = str(parsed.get("reason", "Hydrological evaluation concluded."))[:200]
        p["status"] = STATUS_AWAITING_PAYOUT
        p["audit_completed_time"] = str(self.simulated_time)
        p["audit_completed_block"] = str(self.simulated_time)
        return _MockTxResult(True)

    def appeal_verdict(self, args, value=0):
        pid = str(args[0]).strip()
        reason = str(args[1]).strip()
        supp_url = str(args[2]).strip()

        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = self.policies[pid]

        if p["status"] != STATUS_AWAITING_PAYOUT:
            raise Exception("Can only appeal policies in AWAITING_PAYOUT status.")
        if self.caller not in (p["enterprise"], p["community_rep"]):
            raise Exception("Role Violation: Only enterprise or community representative can file an appeal.")

        audit_time = int(p["audit_completed_time"])
        if self.simulated_time > (audit_time + COOLING_OFF_SECONDS):
            raise Exception(f"Dispute cooling-off window ({COOLING_OFF_SECONDS}s) has expired.")

        if not _is_accredited_hydrological_source(supp_url):
            raise Exception("Supplemental telemetry unauthenticated: Must originate from an accredited water monitoring authority.")

        escrow = int(p["escrow_amount"])
        req_bond = max(1, (escrow * 10) // 100)
        staked = int(value)
        if staked < req_bond:
            raise Exception(f"Must stake at least 10% dispute bond ({req_bond} wei).")

        if len(reason) < 10:
            raise Exception("Detailed dispute justification (>= 10 chars) required.")

        p["appeal_prior_verdict"] = p["verdict"]
        p["status"] = STATUS_DISPUTED
        p["dispute_initiator"] = self.caller
        p["dispute_bond"] = str(staked)
        p["supplemental_evidence_url"] = supp_url
        p["reason"] = f"[DISPUTE by {self.caller[:8]}]: {reason} | Prior: {p['reason']}"
        self.total_water_locked += staked
        return _MockTxResult(True)

    def adjudicate_appeal(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = self.policies[pid]

        if p["status"] != STATUS_DISPUTED:
            raise Exception("Policy is not in DISPUTED status.")
        if self.caller not in (p["enterprise"], p["community_rep"], self.owner):
            raise Exception("Permission Denied: Only enterprise, community rep, or owner can adjudicate appeal.")

        mocks = getattr(self.client.provider, "installed_mocks", {})
        web_mocks = mocks.get("web_mocks", {})
        llm_mocks = mocks.get("llm_mocks", {})

        supp_url = p["supplemental_evidence_url"]
        web_res = web_mocks.get(supp_url, {})
        raw_supp = web_res.get("body", "")

        if not raw_supp:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "APPEAL_UNRESOLVED_FETCH_FAILED"
            p["reason"] = "[APPEAL UNRESOLVED] Supplemental water monitoring feed unreachable."
            return _MockTxResult(True)

        mock_reply = None
        for pattern, reply in llm_mocks.items():
            if pattern == ".*" or re.search(pattern, supp_url):
                mock_reply = reply
                break

        if not mock_reply:
            mock_reply = json.dumps({
                "canary": CANARY_TOKEN,
                "verdict": "APPEAL_UPHELD_COMPLIANT",
                "reason": "Supplemental piezometer confirms water table recharged."
            })

        try:
            parsed = json.loads(mock_reply)
        except Exception:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "APPEAL_UNRESOLVED_PARSE_FAILED"
            p["reason"] = "[APPEAL UNRESOLVED] Appellate parsing failure."
            return _MockTxResult(True)

        if parsed.get("canary") != CANARY_TOKEN:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "APPEAL_UNRESOLVED_PARSE_FAILED"
            p["reason"] = "[APPEAL UNRESOLVED] Security canary mismatch."
            return _MockTxResult(True)

        v_str = str(parsed.get("verdict", "")).upper().strip()
        app_reason = str(parsed.get("reason", "Appellate review completed."))[:200]

        escrow_val = int(p["escrow_amount"])
        bond_val = int(p["dispute_bond"])
        p["dispute_bond"] = "0"
        p["escrow_amount"] = "0"

        self.total_water_locked -= (escrow_val + bond_val)
        self.total_policies_settled += 1

        appellant = p["dispute_initiator"]
        is_ent_appellant = (appellant == p["enterprise"])
        counterparty = p["community_rep"] if is_ent_appellant else p["enterprise"]

        if v_str == "APPEAL_UPHELD_DEPLETION":
            p["status"] = STATUS_SETTLED_RELIEF_PAID
            p["verdict"] = "AQUIFER_DEPLETION_CONFIRMED"
            p["reason"] = f"[APPEAL UPHELD] {app_reason}"
            if not is_ent_appellant:
                self.claimable_balances[appellant] = self.claimable_balances.get(appellant, 0) + bond_val
            else:
                self.claimable_balances[counterparty] = self.claimable_balances.get(counterparty, 0) + bond_val
            self.claimable_balances[p["community_rep"]] = self.claimable_balances.get(p["community_rep"], 0) + escrow_val

        elif v_str == "APPEAL_UPHELD_PARTIAL":
            p["status"] = STATUS_SETTLED_PARTIAL
            p["verdict"] = "PARTIAL_DRAWDOWN_PENALTY"
            payout = (escrow_val * 40) // 100
            refund = escrow_val - payout
            p["reason"] = f"[APPEAL RESOLUTION] {app_reason}"
            self.claimable_balances[p["community_rep"]] = self.claimable_balances.get(p["community_rep"], 0) + payout
            self.claimable_balances[p["enterprise"]] = self.claimable_balances.get(p["enterprise"], 0) + refund
            self.claimable_balances[appellant] = self.claimable_balances.get(appellant, 0) + bond_val

        elif v_str == "APPEAL_UPHELD_COMPLIANT":
            p["status"] = STATUS_SETTLED_COMPLIANT
            p["verdict"] = "AQUIFER_COMPLIANT_CLEAN"
            p["reason"] = f"[APPEAL RESOLUTION] {app_reason}"
            self.claimable_balances[p["enterprise"]] = self.claimable_balances.get(p["enterprise"], 0) + escrow_val
            if is_ent_appellant:
                self.claimable_balances[appellant] = self.claimable_balances.get(appellant, 0) + bond_val
            else:
                self.claimable_balances[counterparty] = self.claimable_balances.get(counterparty, 0) + bond_val

        else:
            p["reason"] = f"[APPEAL DISMISSED] {app_reason}"
            self.claimable_balances[counterparty] = self.claimable_balances.get(counterparty, 0) + bond_val
            orig = p["original_verdict"]
            if orig == "AQUIFER_DEPLETION_CONFIRMED":
                p["status"] = STATUS_SETTLED_RELIEF_PAID
                p["verdict"] = "AQUIFER_DEPLETION_CONFIRMED"
                self.claimable_balances[p["community_rep"]] = self.claimable_balances.get(p["community_rep"], 0) + escrow_val
            elif orig == "PARTIAL_DRAWDOWN_PENALTY":
                p["status"] = STATUS_SETTLED_PARTIAL
                p["verdict"] = "PARTIAL_DRAWDOWN_PENALTY"
                payout = (escrow_val * 40) // 100
                refund = escrow_val - payout
                self.claimable_balances[p["community_rep"]] = self.claimable_balances.get(p["community_rep"], 0) + payout
                self.claimable_balances[p["enterprise"]] = self.claimable_balances.get(p["enterprise"], 0) + refund
            else:
                p["status"] = STATUS_SETTLED_COMPLIANT
                p["verdict"] = "AQUIFER_COMPLIANT_CLEAN"
                self.claimable_balances[p["enterprise"]] = self.claimable_balances.get(p["enterprise"], 0) + escrow_val

        return _MockTxResult(True)

    def finalize_settlement(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = self.policies[pid]

        if p["status"] == STATUS_UNRESOLVED or p["verdict"].startswith("UNRESOLVED_") or p["verdict"].startswith("APPEAL_UNRESOLVED_"):
            raise Exception("Cannot settle policy in an unresolved error state. Escrow remains protected.")

        if p["status"] != STATUS_AWAITING_PAYOUT:
            raise Exception("Policy is not awaiting settlement payout.")

        if self.caller not in (p["enterprise"], p["community_rep"], self.owner):
            raise Exception("Permission Denied: Only stakeholders or owner can finalize payout.")

        audit_time = int(p["audit_completed_time"])
        if self.simulated_time <= (audit_time + COOLING_OFF_SECONDS):
            raise Exception(f"Cooling-off challenge window ({COOLING_OFF_SECONDS}s) is still active.")

        escrow_val = int(p["escrow_amount"])
        p["escrow_amount"] = "0"
        self.total_water_locked -= escrow_val
        self.total_policies_settled += 1

        if p["verdict"] == "AQUIFER_DEPLETION_CONFIRMED":
            p["status"] = STATUS_SETTLED_RELIEF_PAID
            self.claimable_balances[p["community_rep"]] = self.claimable_balances.get(p["community_rep"], 0) + escrow_val
        elif p["verdict"] == "PARTIAL_DRAWDOWN_PENALTY":
            p["status"] = STATUS_SETTLED_PARTIAL
            payout = (escrow_val * 40) // 100
            refund = escrow_val - payout
            self.claimable_balances[p["community_rep"]] = self.claimable_balances.get(p["community_rep"], 0) + payout
            self.claimable_balances[p["enterprise"]] = self.claimable_balances.get(p["enterprise"], 0) + refund
        else:
            p["status"] = STATUS_SETTLED_COMPLIANT
            self.claimable_balances[p["enterprise"]] = self.claimable_balances.get(p["enterprise"], 0) + escrow_val

        return _MockTxResult(True)

    def cancel_or_reclaim(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = self.policies[pid]

        if self.caller != p["enterprise"]:
            raise Exception("Role Violation: Only enterprise can reclaim expired water-rights escrow.")

        if p["status"] in (STATUS_POLICY_ACTIVE, STATUS_UNRESOLVED):
            if self.simulated_time < int(p["expires_at_time"]):
                raise Exception(f"Cannot reclaim: Policy is still active (expires at {int(p['expires_at_time'])}).")
        else:
            raise Exception("Cannot reclaim: Depletion alert actively undergoing evaluation or already settled.")

        p["status"] = STATUS_EXPIRED_RECLAIMED
        p["verdict"] = "EXPIRED_CLEAN"
        p["reason"] = "Policy duration completed without active depletion triggers. Escrow reclaimed by enterprise."

        escrow_val = int(p["escrow_amount"])
        p["escrow_amount"] = "0"
        self.total_water_locked -= escrow_val
        self.claimable_balances[p["enterprise"]] = self.claimable_balances.get(p["enterprise"], 0) + escrow_val
        return _MockTxResult(True)

    def claim_payout(self, args=None):
        bal = self.claimable_balances.get(self.caller, 0)
        if bal <= 0:
            raise Exception("No claimable balance available for withdrawal.")
        self.claimable_balances[self.caller] = 0
        return _MockTxResult(True)

    def get_policy(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        return _MockCallResult(json.dumps(self.policies[pid]))

    def get_policy_count(self, args=None):
        return _MockCallResult(len(self.policy_ids))

    def get_all_policies(self, args=None):
        lst = [self.policies[pid] for pid in self.policy_ids if pid in self.policies]
        return _MockCallResult(json.dumps(lst))

    def get_claimable_balance(self, args):
        account = str(args[0]).lower().strip()
        return _MockCallResult(str(self.claimable_balances.get(account, 0)))

    def get_stats(self, args=None):
        stats = {
            "total_policies": len(self.policy_ids),
            "total_water_locked": str(self.total_water_locked),
            "total_policies_settled": self.total_policies_settled,
            "owner": self.owner,
        }
        return _MockCallResult(json.dumps(stats))


class _MockProvider:
    def __init__(self):
        self.installed_mocks = {}

    def make_request(self, method, params):
        if method == "sim_installMocks":
            self.installed_mocks = params
            return {"status": "ok"}
        return {}


class _MockClient:
    def __init__(self):
        self.accounts = [
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222",
            "0x3333333333333333333333333333333333333333",
            "0x4444444444444444444444444444444444444444",
        ]
        self.provider = _MockProvider()

    def deploy(self, contract_path, *args, **kwargs):
        return _MockContractInstance(self, contract_path, *args, **kwargs)


@pytest.fixture
def client():
    return _MockClient()
