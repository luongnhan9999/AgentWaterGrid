# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json
import hashlib

CANARY_TOKEN = "CANARY_AGENT_WATER_GRID_V1"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

# Time & Cooling-Off Parameters
SECONDS_PER_BLOCK = 3
COOLING_OFF_BLOCKS = 24
COOLING_OFF_SECONDS = bigint(COOLING_OFF_BLOCKS * SECONDS_PER_BLOCK)  # 72 seconds
DEFAULT_WATER_POLICY_SECONDS = bigint(86400 * 30)                     # 30 days coverage

# Lifecycle Statuses
STATUS_POLICY_ACTIVE = u8(0)       # Enterprise locked water-rights indemnity escrow
STATUS_DEPLETION_ALERT = u8(1)     # Hydrological depletion alert filed with sensor endpoint
STATUS_AWAITING_PAYOUT = u8(2)     # AI hydrology tribunal rendered verdict, cooling-off active
STATUS_SETTLED_RELIEF_PAID = u8(3) # Severe aquifer depletion verified, 100% indemnity released to community
STATUS_SETTLED_PARTIAL = u8(4)     # Moderate drawdown detected, 40% relief paid, 60% preserved
STATUS_SETTLED_COMPLIANT = u8(5)   # Water table compliant with safety thresholds, 100% refunded to enterprise
STATUS_DISPUTED = u8(6)            # Under appellate review with 10% staked bond
STATUS_EXPIRED_RECLAIMED = u8(7)   # Policy expired with zero breach, reclaimed by enterprise
STATUS_UNRESOLVED = u8(8)          # Telemetry fetch, parse, or canary failure (non-settling protected state)


class ContractError(Exception):
    """Domain-specific error for AgentWaterGrid protocol."""
    pass


def _addr_str(addr) -> str:
    """Safely format an Address, int, or string into a lowercase hex string."""
    if isinstance(addr, Address):
        try:
            return addr.as_hex.lower()
        except Exception:
            pass
    try:
        if isinstance(addr, int):
            return f"0x{addr:040x}".lower()
    except Exception:
        pass
    return str(addr).lower().strip()


def _to_address(val) -> Address:
    """Safely convert Address, int (from calldata/runner), or hex string into a true Address instance."""
    if isinstance(val, Address):
        return val
    try:
        if isinstance(val, int):
            return Address(f"0x{val:040x}")
        s = str(val).strip()
        if s.startswith("0x") and len(s) == 42:
            return Address(s)
    except Exception:
        pass
    return Address(ZERO_ADDRESS)


def _get_sender() -> Address:
    """Safely obtain transaction sender across GenVM runtime versions."""
    try:
        return _to_address(gl.message.sender_address)
    except Exception:
        try:
            return _to_address(gl.message.sender)
        except Exception:
            raise ContractError("Cannot resolve sender address.")


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
    """Verifies that telemetry originates strictly from accredited national/international water authorities."""
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


@allow_storage
@dataclass
class WaterEscrowPolicy:
    policy_id: str
    enterprise: Address            # Industrial consumer / Desalination plant operator
    community_rep: Address         # Municipal water board / Farmer cooperative
    dispute_initiator: Address     # Appellant who staked bond
    escrow_amount: bigint          # Locked indemnity / relief fund
    dispute_bond: bigint           # 10% appeal stake
    aquifer_basin_id: str          # Basin code / Wellhead identifier
    max_tolerable_drawdown_m: u32  # Maximum allowed water table drop in centimeters (e.g. 150 = 1.5m)
    max_salinity_tds_ppm: u32      # Max allowable Total Dissolved Solids in PPM (e.g. 500 ppm)
    hydrology_feed_url: str        # Accredited live sensor/telemetry endpoint
    evidence_hash: str             # SHA-256 snapshot of sensor telemetry
    status: u8
    verdict: str                   # "PENDING", "AQUIFER_DEPLETION_CONFIRMED", "PARTIAL_DRAWDOWN_PENALTY", "AQUIFER_COMPLIANT_CLEAN", "DISPUTED", "UNRESOLVED_*"
    original_verdict: str          # Preserved pre-appeal verdict
    reason: str
    confidence: u8
    measured_drawdown_cm: u32      # Measured drop in water table (cm)
    measured_salinity_ppm: u32     # Measured salinity (TDS in ppm)
    created_at_time: bigint        # Trusted Unix timestamp when policy was created
    expires_at_time: bigint        # Trusted Unix timestamp when coverage concludes
    audit_completed_time: bigint   # Trusted Unix timestamp when AI jury rendered verdict
    supplemental_evidence_url: str # Bound appellate evidence URL
    appeal_prior_verdict: str      # Verdict recorded before appeal was filed


class Contract(gl.Contract):
    """
    AgentWaterGrid: Autonomous Desalination & Groundwater Depletion Parametric Water-Rights Escrow
    Target Network: GenLayer StudioNet (Chain ID: 61999)
    """
    policies: TreeMap[str, WaterEscrowPolicy]
    policy_ids: DynArray[str]
    total_water_locked: bigint
    total_policies_settled: u32
    policy_counter: u64
    owner: Address
    claimable_balances: TreeMap[str, bigint]

    def __init__(self, initial_owner: Address = Address(ZERO_ADDRESS)):
        deployer = Address(ZERO_ADDRESS)
        try:
            deployer = _get_sender()
        except Exception:
            pass

        cand = _to_address(initial_owner)
        target_owner = cand if _addr_str(cand) != ZERO_ADDRESS else deployer
        self.owner = target_owner
        self.total_water_locked = bigint(0)
        self.total_policies_settled = u32(0)
        self.policy_counter = u64(0)

    def _resolve_pid(self, policy_id) -> str:
        return str(policy_id).strip()

    def _ensure_owner(self) -> None:
        if _addr_str(self.owner) == ZERO_ADDRESS:
            self.owner = _get_sender()

    def _safe_transfer(self, recipient: Address, amount: bigint) -> None:
        """Transfers native GEN tokens with Pull-Payment fallback to eliminate lost funds."""
        if amount <= bigint(0):
            return
        rec_addr = _to_address(recipient)
        rec_str = _addr_str(rec_addr)
        try:
            gl.get_contract_at(rec_addr).emit_transfer(value=u256(int(amount)))
        except Exception:
            curr = self.claimable_balances.get(rec_str, bigint(0))
            self.claimable_balances[rec_str] = curr + amount

    def _get_current_timestamp(self) -> bigint:
        """Derives trusted Unix timestamp strictly from consensus context (gl.message_raw['datetime'])."""
        import calendar
        from datetime import datetime, timezone
        try:
            if hasattr(gl, "message_raw") and isinstance(gl.message_raw, dict):
                raw_val = gl.message_raw.get("datetime", "")
                if raw_val:
                    dt_str = str(raw_val).strip().replace("Z", "+00:00")
                    dt = datetime.fromisoformat(dt_str)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    ts = calendar.timegm(dt.utctimetuple())
                    if ts > 0:
                        return bigint(ts)
        except Exception:
            pass
        return bigint(1760000000)

    # ── Public Write Methods ──────────────────────────────────────────

    @gl.public.write.payable
    def create_water_license_escrow(
        self,
        community_representative: Address,
        aquifer_basin_id: str,
        max_tolerable_drawdown_cm: u32,
        max_salinity_tds_ppm: u32,
        duration_blocks: u32
    ) -> str:
        """Enterprise locks indemnity escrow guaranteeing sustainable groundwater extraction."""
        self._ensure_owner()
        escrow = bigint(gl.message.value)
        if escrow <= bigint(0):
            raise ContractError("Water rights escrow deposit must be greater than 0 GEN.")

        clean_basin = str(aquifer_basin_id).strip()
        if len(clean_basin) < 4:
            raise ContractError("Valid aquifer basin/wellhead ID required.")

        comm_addr = _to_address(community_representative)
        if _addr_str(comm_addr) == ZERO_ADDRESS:
            raise ContractError("Valid community representative address required.")

        sender = _to_address(_get_sender())
        if _addr_str(sender) == _addr_str(comm_addr):
            raise ContractError("Enterprise cannot designate themselves as community beneficiary.")

        dur_secs = bigint(int(duration_blocks) * 3 if int(duration_blocks) > 0 else int(DEFAULT_WATER_POLICY_SECONDS))

        self.policy_counter = self.policy_counter + u64(1)
        policy_id = str(self.policy_counter)
        current_time = self._get_current_timestamp()
        expires_at = current_time + dur_secs
        empty_addr = Address(ZERO_ADDRESS)

        new_policy = WaterEscrowPolicy(
            policy_id=policy_id,
            enterprise=sender,
            community_rep=comm_addr,
            dispute_initiator=empty_addr,
            escrow_amount=escrow,
            dispute_bond=bigint(0),
            aquifer_basin_id=clean_basin,
            max_tolerable_drawdown_m=max_tolerable_drawdown_cm,
            max_salinity_tds_ppm=max_salinity_tds_ppm,
            hydrology_feed_url="",
            evidence_hash="",
            status=STATUS_POLICY_ACTIVE,
            verdict="PENDING",
            original_verdict="PENDING",
            reason="Water-rights policy active. Monitored for aquifer drawdown and salinity intrusion.",
            confidence=u8(0),
            measured_drawdown_cm=u32(0),
            measured_salinity_ppm=u32(0),
            created_at_time=current_time,
            expires_at_time=expires_at,
            audit_completed_time=bigint(0),
            supplemental_evidence_url="",
            appeal_prior_verdict="",
        )

        self.policies[policy_id] = new_policy
        self.policy_ids.append(policy_id)
        self.total_water_locked = self.total_water_locked + escrow
        return policy_id

    @gl.public.write
    def trigger_depletion_claim(
        self,
        policy_id: str,
        hydrology_feed_url: str
    ) -> None:
        """Community representative submits accredited hydrological sensor or telemetry link."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status not in (STATUS_POLICY_ACTIVE, STATUS_UNRESOLVED):
            raise ContractError("Policy is not in an active or retryable status.")

        sender = _to_address(_get_sender())
        if _addr_str(sender) != _addr_str(p.community_rep):
            raise ContractError("Role Violation: Only the registered community representative can file a depletion alert.")

        clean_url = str(hydrology_feed_url).strip()
        if not _is_accredited_hydrological_source(clean_url):
            raise ContractError("Telemetry unauthenticated: Must originate from an accredited water monitoring authority (USGS, Copernicus, GRDC, NOAA).")

        current_time = self._get_current_timestamp()
        if current_time > p.expires_at_time:
            raise ContractError("Policy coverage duration has expired.")

        p.hydrology_feed_url = clean_url
        p.status = STATUS_DEPLETION_ALERT
        p.reason = "Hydrological depletion alert filed. Ready for on-chain AI Tribunal verification."

    @gl.public.write
    def adjudicate_water_drawdown(self, policy_id: str) -> None:
        """AI Hydrological Jury evaluates water table drop and salinity levels against policy SLA."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status not in (STATUS_DEPLETION_ALERT, STATUS_UNRESOLVED):
            raise ContractError("Policy is not awaiting depletion adjudication.")

        sender_str = _addr_str(_get_sender())
        if (
            sender_str != _addr_str(p.enterprise)
            and sender_str != _addr_str(p.community_rep)
            and sender_str != _addr_str(self.owner)
        ):
            raise ContractError("Permission Denied: Only enterprise, community rep, or owner can trigger adjudication.")

        feed_url = p.hydrology_feed_url
        basin = p.aquifer_basin_id
        max_drawdown = int(p.max_tolerable_drawdown_m)
        max_salinity = int(p.max_salinity_tds_ppm)

        def leader_fn():
            raw_feed = ""
            try:
                raw_feed = gl.nondet.web.render(feed_url, mode="text")
            except Exception:
                pass

            if not raw_feed:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_FETCH_FAILED",
                    "confidence": 0,
                    "measured_drawdown_cm": 0,
                    "measured_salinity_ppm": 0,
                    "reason": "Hydrological sensor telemetry endpoint unreachable or empty.",
                    "evidence_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                }

            ev_hash = hashlib.sha256(raw_feed.encode("utf-8")).hexdigest()

            prompt = f"""You are the Chief Hydrological Arbiter and Water-Rights Magistrate on GenLayer.
Evaluate live telemetry for aquifer basin: {basin}.
TOLERABLE DRAWDOWN THRESHOLD: <= {max_drawdown} cm
MAXIMUM PERMISSIBLE SALINITY (TDS): <= {max_salinity} ppm

HYDROLOGICAL SENSOR TELEMETRY:
<sensor_payload>
{raw_feed[:4000]}
</sensor_payload>

EVALUATION RUBRIC:
1. Extract measured aquifer drawdown (water table drop) in centimeters.
2. Extract measured Total Dissolved Solids / salinity in PPM.
3. Decision Matrix:
   - Severe Depletion: Drawdown >= {max_drawdown} cm OR Salinity >= {max_salinity} ppm:
     Output "AQUIFER_DEPLETION_CONFIRMED" (100% indemnity relief payout to community).
   - Moderate Drawdown: Drawdown between ({max_drawdown} // 2) and ({max_drawdown} - 1) cm:
     Output "PARTIAL_DRAWDOWN_PENALTY" (40% compensation payout to community, 60% preserved).
   - Safe Level: Drawdown < ({max_drawdown} // 2) cm AND Salinity within normal limits:
     Output "AQUIFER_COMPLIANT_CLEAN" (0% payout, claim dismissed).

SECURITY CANARY: Echo "{CANARY_TOKEN}" in JSON.
Respond ONLY with valid JSON without markdown fences:
{{
  "canary": "{CANARY_TOKEN}",
  "verdict": "AQUIFER_DEPLETION_CONFIRMED" | "PARTIAL_DRAWDOWN_PENALTY" | "AQUIFER_COMPLIANT_CLEAN",
  "confidence": <0-100>,
  "measured_drawdown_cm": <integer>,
  "measured_salinity_ppm": <integer>,
  "reason": "<factual hydrological analysis under 200 chars>"
}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = None
            if isinstance(raw_res, dict):
                parsed = raw_res
            elif isinstance(raw_res, str):
                try:
                    parsed = json.loads(raw_res.replace("```json", "").replace("```", "").strip())
                except Exception:
                    pass

            if not parsed or not isinstance(parsed, dict):
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_PARSE_FAILED",
                    "confidence": 0,
                    "measured_drawdown_cm": 0,
                    "measured_salinity_ppm": 0,
                    "reason": "AI validator parsing failed or malformed JSON returned.",
                    "evidence_hash": ev_hash,
                }

            if str(parsed.get("canary", "")) != CANARY_TOKEN:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_CANARY_FAILED",
                    "confidence": 0,
                    "measured_drawdown_cm": 0,
                    "measured_salinity_ppm": 0,
                    "reason": "Security canary mismatch detected in jury output.",
                    "evidence_hash": ev_hash,
                }

            v_raw = str(parsed.get("verdict", "")).upper().strip()
            if v_raw not in {"AQUIFER_DEPLETION_CONFIRMED", "PARTIAL_DRAWDOWN_PENALTY", "AQUIFER_COMPLIANT_CLEAN"}:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_PARSE_FAILED",
                    "confidence": 0,
                    "measured_drawdown_cm": 0,
                    "measured_salinity_ppm": 0,
                    "reason": f"Unsupported verdict '{v_raw}' returned.",
                    "evidence_hash": ev_hash,
                }

            return {
                "canary": CANARY_TOKEN,
                "verdict": v_raw,
                "confidence": max(0, min(100, int(parsed.get("confidence", 85)))),
                "measured_drawdown_cm": max(0, min(10000, int(parsed.get("measured_drawdown_cm", 0)))),
                "measured_salinity_ppm": max(0, min(100000, int(parsed.get("measured_salinity_ppm", 0)))),
                "reason": str(parsed.get("reason", "Hydrological evaluation concluded."))[:200],
                "evidence_hash": ev_hash,
            }

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False
            if leader.get("canary") != CANARY_TOKEN:
                return False
            mine = leader_fn()
            return mine["verdict"] == leader["verdict"]

        adjudication_res = gl.vm.run_nondet(leader_fn, validator_fn)
        v_res = str(adjudication_res["verdict"])
        p.verdict = v_res
        p.reason = str(adjudication_res["reason"])
        p.confidence = u8(int(adjudication_res["confidence"]))
        p.measured_drawdown_cm = u32(int(adjudication_res["measured_drawdown_cm"]))
        p.measured_salinity_ppm = u32(int(adjudication_res["measured_salinity_ppm"]))
        if "evidence_hash" in adjudication_res and adjudication_res["evidence_hash"]:
            p.evidence_hash = str(adjudication_res["evidence_hash"])

        if v_res.startswith("UNRESOLVED_"):
            p.status = STATUS_UNRESOLVED
            p.audit_completed_time = bigint(0)
        else:
            p.original_verdict = v_res
            current_time = self._get_current_timestamp()
            p.status = STATUS_AWAITING_PAYOUT
            p.audit_completed_time = current_time

    @gl.public.write.payable
    def appeal_verdict(
        self,
        policy_id: str,
        dispute_reason: str,
        supplemental_hydro_url: str
    ) -> None:
        """Enterprise or Community rep can appeal within 24 blocks (~72s) with a 10% staked bond."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status != STATUS_AWAITING_PAYOUT:
            raise ContractError("Can only appeal policies in AWAITING_PAYOUT status.")

        sender = _to_address(_get_sender())
        if _addr_str(sender) != _addr_str(p.enterprise) and _addr_str(sender) != _addr_str(p.community_rep):
            raise ContractError("Role Violation: Only enterprise or community representative can file an appeal.")

        current_time = self._get_current_timestamp()
        if current_time > (p.audit_completed_time + COOLING_OFF_SECONDS):
            raise ContractError(f"Dispute cooling-off window ({int(COOLING_OFF_SECONDS)}s) has expired.")

        clean_url = str(supplemental_hydro_url).strip()
        if not _is_accredited_hydrological_source(clean_url):
            raise ContractError("Supplemental telemetry unauthenticated: Must originate from an accredited water monitoring authority.")

        required_bond = (p.escrow_amount * bigint(10)) // bigint(100)
        if required_bond == bigint(0):
            required_bond = bigint(1)

        staked = bigint(gl.message.value)
        if staked < required_bond:
            raise ContractError(f"Must stake at least 10% dispute bond ({int(required_bond)} wei).")

        clean_reason = str(dispute_reason).strip()
        if len(clean_reason) < 10:
            raise ContractError("Detailed dispute justification (>= 10 chars) required.")

        p.appeal_prior_verdict = p.verdict
        p.status = STATUS_DISPUTED
        p.dispute_initiator = sender
        p.dispute_bond = staked
        p.supplemental_evidence_url = clean_url
        p.reason = f"[DISPUTE by {_addr_str(sender)[:8]}]: {clean_reason} | Prior: {p.reason}"
        self.total_water_locked = self.total_water_locked + staked

    @gl.public.write
    def adjudicate_appeal(self, policy_id: str) -> None:
        """Supreme Hydrological Appellate Court evaluates strictly against bound supplemental observation data."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status != STATUS_DISPUTED:
            raise ContractError("Policy is not in DISPUTED status.")

        sender_str = _addr_str(_get_sender())
        if (
            sender_str != _addr_str(p.enterprise)
            and sender_str != _addr_str(p.community_rep)
            and sender_str != _addr_str(self.owner)
        ):
            raise ContractError("Permission Denied: Only enterprise, community rep, or owner can adjudicate appeal.")

        bound_url = p.supplemental_evidence_url
        appellant = p.dispute_initiator
        prior_verdict = p.appeal_prior_verdict
        is_enterprise_appellant = (_addr_str(appellant) == _addr_str(p.enterprise))

        def leader_fn():
            raw_supp = ""
            try:
                raw_supp = gl.nondet.web.render(bound_url, mode="text")
            except Exception:
                pass

            if not raw_supp:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "APPEAL_UNRESOLVED_FETCH_FAILED",
                    "reason": "Supplemental water monitoring feed unreachable.",
                }

            prompt = f"""You are the Supreme Hydrological Appellate Magistrate on GenLayer.
Evaluate bound piezometric / groundwater depth telemetry for aquifer basin {p.aquifer_basin_id}:
PRIOR VERDICT: {prior_verdict}
APPELLANT: {'ENTERPRISE' if is_enterprise_appellant else 'COMMUNITY_REPRESENTATIVE'}

SUPPLEMENTAL AUDIT DATA:
{raw_supp[:4000]}

DECISION CRITERIA:
- If supplemental logs verify critical aquifer depletion breach: Output "APPEAL_UPHELD_DEPLETION".
- If partial water drawdown verified: Output "APPEAL_UPHELD_PARTIAL".
- If logs conclusively prove aquifer recharge / compliant baseline: Output "APPEAL_UPHELD_COMPLIANT".
- Otherwise: Output "APPEAL_DISMISSED".

SECURITY CANARY: Echo "{CANARY_TOKEN}" in JSON.
Respond ONLY with valid JSON:
{{"canary": "{CANARY_TOKEN}", "verdict": "APPEAL_UPHELD_DEPLETION"|"APPEAL_UPHELD_PARTIAL"|"APPEAL_UPHELD_COMPLIANT"|"APPEAL_DISMISSED", "reason": "<rationale under 200 chars>"}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = None
            if isinstance(raw_res, dict):
                parsed = raw_res
            elif isinstance(raw_res, str):
                try:
                    parsed = json.loads(raw_res.replace("```json", "").replace("```", "").strip())
                except Exception:
                    pass

            if not parsed or not isinstance(parsed, dict) or str(parsed.get("canary", "")) != CANARY_TOKEN:
                return {"canary": CANARY_TOKEN, "verdict": "APPEAL_UNRESOLVED_PARSE_FAILED", "reason": "Appellate parsing failure."}

            v_str = str(parsed.get("verdict", "")).upper().strip()
            if v_str not in {"APPEAL_UPHELD_DEPLETION", "APPEAL_UPHELD_PARTIAL", "APPEAL_UPHELD_COMPLIANT", "APPEAL_DISMISSED"}:
                v_str = "APPEAL_UNRESOLVED_PARSE_FAILED"

            return {
                "canary": CANARY_TOKEN,
                "verdict": v_str,
                "reason": str(parsed.get("reason", "Appellate review completed."))[:200]
            }

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False
            if leader.get("canary") != CANARY_TOKEN:
                return False
            mine = leader_fn()
            return mine["verdict"] == leader["verdict"]

        appeal_res = gl.vm.run_nondet(leader_fn, validator_fn)
        app_verdict = appeal_res["verdict"]
        app_reason = appeal_res["reason"]

        if app_verdict.startswith("APPEAL_UNRESOLVED_"):
            p.status = STATUS_UNRESOLVED
            p.verdict = app_verdict
            p.reason = f"[APPEAL UNRESOLVED] {app_reason}"
            return

        escrow_val = p.escrow_amount
        bond_val = p.dispute_bond
        total_settling = escrow_val + bond_val
        p.dispute_bond = bigint(0)
        p.escrow_amount = bigint(0)  # Double-payout protection

        self.total_water_locked = self.total_water_locked - total_settling
        self.total_policies_settled = self.total_policies_settled + u32(1)

        counterparty = p.community_rep if is_enterprise_appellant else p.enterprise

        if app_verdict == "APPEAL_UPHELD_DEPLETION":
            p.status = STATUS_SETTLED_RELIEF_PAID
            p.verdict = "AQUIFER_DEPLETION_CONFIRMED"
            p.reason = f"[APPEAL UPHELD] {app_reason}"
            self._safe_transfer(p.community_rep, escrow_val)
            if not is_enterprise_appellant:
                self._safe_transfer(appellant, bond_val)
            else:
                self._safe_transfer(counterparty, bond_val)

        elif app_verdict == "APPEAL_UPHELD_PARTIAL":
            p.status = STATUS_SETTLED_PARTIAL
            p.verdict = "PARTIAL_DRAWDOWN_PENALTY"
            payout = (escrow_val * bigint(40)) // bigint(100)
            refund = escrow_val - payout
            p.reason = f"[APPEAL RESOLUTION] {app_reason}"
            self._safe_transfer(p.community_rep, payout)
            self._safe_transfer(p.enterprise, refund)
            self._safe_transfer(appellant, bond_val)

        elif app_verdict == "APPEAL_UPHELD_COMPLIANT":
            p.status = STATUS_SETTLED_COMPLIANT
            p.verdict = "AQUIFER_COMPLIANT_CLEAN"
            p.reason = f"[APPEAL RESOLUTION] {app_reason}"
            self._safe_transfer(p.enterprise, escrow_val)
            if is_enterprise_appellant:
                self._safe_transfer(appellant, bond_val)
            else:
                self._safe_transfer(counterparty, bond_val)

        else:
            # APPEAL_DISMISSED: Preserve original verdict and forfeit bond to counterparty
            p.reason = f"[APPEAL DISMISSED] {app_reason}"
            self._safe_transfer(counterparty, bond_val)

            if p.original_verdict == "AQUIFER_DEPLETION_CONFIRMED":
                p.status = STATUS_SETTLED_RELIEF_PAID
                p.verdict = "AQUIFER_DEPLETION_CONFIRMED"
                self._safe_transfer(p.community_rep, escrow_val)
            elif p.original_verdict == "PARTIAL_DRAWDOWN_PENALTY":
                p.status = STATUS_SETTLED_PARTIAL
                p.verdict = "PARTIAL_DRAWDOWN_PENALTY"
                payout = (escrow_val * bigint(40)) // bigint(100)
                refund = escrow_val - payout
                self._safe_transfer(p.community_rep, payout)
                self._safe_transfer(p.enterprise, refund)
            else:
                p.status = STATUS_SETTLED_COMPLIANT
                p.verdict = "AQUIFER_COMPLIANT_CLEAN"
                self._safe_transfer(p.enterprise, escrow_val)

    @gl.public.write
    def finalize_settlement(self, policy_id: str) -> None:
        """Executes uncontested settlement strictly after 24 blocks (~72s) cooling-off window."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status == STATUS_UNRESOLVED or p.verdict.startswith("UNRESOLVED_") or p.verdict.startswith("APPEAL_UNRESOLVED_"):
            raise ContractError("Cannot settle policy in an unresolved error state. Escrow remains protected.")

        if p.status != STATUS_AWAITING_PAYOUT:
            raise ContractError("Policy is not awaiting settlement payout.")

        sender_str = _addr_str(_get_sender())
        if (
            sender_str != _addr_str(p.enterprise)
            and sender_str != _addr_str(p.community_rep)
            and sender_str != _addr_str(self.owner)
        ):
            raise ContractError("Permission Denied: Only stakeholders or owner can finalize payout.")

        current_time = self._get_current_timestamp()
        if current_time <= (p.audit_completed_time + COOLING_OFF_SECONDS):
            raise ContractError(f"Cooling-off challenge window ({int(COOLING_OFF_SECONDS)}s) is still active.")

        escrow_val = p.escrow_amount
        p.escrow_amount = bigint(0)  # Double-payout protection
        self.total_water_locked = self.total_water_locked - escrow_val
        self.total_policies_settled = self.total_policies_settled + u32(1)

        if p.verdict == "AQUIFER_DEPLETION_CONFIRMED":
            p.status = STATUS_SETTLED_RELIEF_PAID
            self._safe_transfer(p.community_rep, escrow_val)

        elif p.verdict == "PARTIAL_DRAWDOWN_PENALTY":
            p.status = STATUS_SETTLED_PARTIAL
            payout = (escrow_val * bigint(40)) // bigint(100)
            refund = escrow_val - payout
            self._safe_transfer(p.community_rep, payout)
            self._safe_transfer(p.enterprise, refund)

        else:
            p.status = STATUS_SETTLED_COMPLIANT
            self._safe_transfer(p.enterprise, escrow_val)

    @gl.public.write
    def cancel_or_reclaim(self, policy_id: str) -> None:
        """Enterprise reclaims escrow if policy expired without alerts or stalled in unresolved state."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if _addr_str(_get_sender()) != _addr_str(p.enterprise):
            raise ContractError("Role Violation: Only enterprise can reclaim expired water-rights escrow.")

        current_time = self._get_current_timestamp()
        if p.status in (STATUS_POLICY_ACTIVE, STATUS_UNRESOLVED):
            if current_time < p.expires_at_time:
                raise ContractError(f"Cannot reclaim: Policy is still active (expires at {int(p.expires_at_time)}).")
        else:
            raise ContractError("Cannot reclaim: Depletion alert actively undergoing evaluation or already settled.")

        p.status = STATUS_EXPIRED_RECLAIMED
        p.verdict = "EXPIRED_CLEAN"
        p.reason = "Policy duration completed without active depletion triggers. Escrow reclaimed by enterprise."

        escrow_val = p.escrow_amount
        p.escrow_amount = bigint(0)
        self.total_water_locked = self.total_water_locked - escrow_val
        self._safe_transfer(p.enterprise, escrow_val)

    @gl.public.write
    def claim_payout(self) -> None:
        """Pull-payment safety withdrawal: Beneficiary claims safely buffered balances."""
        self._ensure_owner()
        sender = _to_address(_get_sender())
        s_str = _addr_str(sender)
        bal = self.claimable_balances.get(s_str, bigint(0))
        if bal <= bigint(0):
            raise ContractError("No claimable balance available for withdrawal.")

        self.claimable_balances[s_str] = bigint(0)
        try:
            gl.get_contract_at(sender).emit_transfer(value=u256(int(bal)))
        except Exception:
            self.claimable_balances[s_str] = bal
            raise ContractError("Outbound transfer failed during claim. Balance safely preserved.")

    # ── Read-only Views ───────────────────────────────────────────────

    @gl.public.view
    def get_policy(self, policy_id: str) -> str:
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        data = {
            "policy_id": p.policy_id,
            "enterprise": _addr_str(p.enterprise),
            "community_rep": _addr_str(p.community_rep),
            "dispute_initiator": _addr_str(p.dispute_initiator),
            "escrow_amount": str(p.escrow_amount),
            "dispute_bond": str(p.dispute_bond),
            "aquifer_basin_id": p.aquifer_basin_id,
            "max_tolerable_drawdown_m": int(p.max_tolerable_drawdown_m),
            "max_salinity_tds_ppm": int(p.max_salinity_tds_ppm),
            "hydrology_feed_url": p.hydrology_feed_url,
            "evidence_hash": p.evidence_hash,
            "status": int(p.status),
            "verdict": p.verdict,
            "original_verdict": p.original_verdict,
            "reason": p.reason,
            "confidence": int(p.confidence),
            "measured_drawdown_cm": int(p.measured_drawdown_cm),
            "measured_salinity_ppm": int(p.measured_salinity_ppm),
            "created_at_time": str(p.created_at_time),
            "expires_at_time": str(p.expires_at_time),
            "audit_completed_time": str(p.audit_completed_time),
            "supplemental_evidence_url": p.supplemental_evidence_url,
            "appeal_prior_verdict": p.appeal_prior_verdict,
            "created_at_block": str(p.created_at_time),
            "expires_at_block": str(p.expires_at_time),
            "audit_completed_block": str(p.audit_completed_time),
        }
        return json.dumps(data)

    @gl.public.view
    def get_policy_count(self) -> u64:
        return u64(len(self.policy_ids))

    @gl.public.view
    def get_all_policies(self) -> str:
        policies_list = []
        for pid in self.policy_ids:
            if pid in self.policies:
                p = self.policies[pid]
                policies_list.append({
                    "policy_id": p.policy_id,
                    "enterprise": _addr_str(p.enterprise),
                    "community_rep": _addr_str(p.community_rep),
                    "dispute_initiator": _addr_str(p.dispute_initiator),
                    "escrow_amount": str(p.escrow_amount),
                    "dispute_bond": str(p.dispute_bond),
                    "aquifer_basin_id": p.aquifer_basin_id,
                    "max_tolerable_drawdown_m": int(p.max_tolerable_drawdown_m),
                    "max_salinity_tds_ppm": int(p.max_salinity_tds_ppm),
                    "hydrology_feed_url": p.hydrology_feed_url,
                    "evidence_hash": p.evidence_hash,
                    "status": int(p.status),
                    "verdict": p.verdict,
                    "original_verdict": p.original_verdict,
                    "reason": p.reason,
                    "confidence": int(p.confidence),
                    "measured_drawdown_cm": int(p.measured_drawdown_cm),
                    "measured_salinity_ppm": int(p.measured_salinity_ppm),
                    "created_at_time": str(p.created_at_time),
                    "expires_at_time": str(p.expires_at_time),
                    "audit_completed_time": str(p.audit_completed_time),
                })
        return json.dumps(policies_list)

    @gl.public.view
    def get_claimable_balance(self, account: Address) -> str:
        acc_addr = _to_address(account)
        acc_str = _addr_str(acc_addr)
        return str(self.claimable_balances.get(acc_str, bigint(0)))

    @gl.public.view
    def get_stats(self) -> str:
        data = {
            "total_policies": len(self.policy_ids),
            "total_water_locked": str(self.total_water_locked),
            "total_policies_settled": int(self.total_policies_settled),
            "owner": _addr_str(self.owner),
        }
        return json.dumps(data)
