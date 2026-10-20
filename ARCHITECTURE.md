# Architecture & Technical Specification — AgentWaterGrid

**AgentWaterGrid** is a decentralized physical infrastructure (DePIN) and parametric water-rights indemnity protocol powered by **GenLayer Intelligent Contracts** on **StudioNet (Chain ID: 61999)**.

---

## 1. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AGENTWATERGRID dAPP                                  │
│                 (React 18 + Vite + TypeScript + TailwindCSS + viem / genlayer-js)       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        GENLAYER STUDIONET RPC (CHAIN ID: 61999)                        │
│                                https://studio.genlayer.com/api                         │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                  INTELLIGENT CONTRACT (contracts/contract.py)                          │
│                                                                                        │
│  • Storage: TreeMap[str, WaterEscrowPolicy], DynArray[str], TreeMap[str, bigint]       │
│  • Security Canary: CANARY_AGENT_WATER_GRID_V1                                         │
│  • Cooling Window: 24 Blocks (~72 Seconds)                                            │
│  • Pull-Payment Buffer: claimable_balances fallback                                    │
└──────────────┬─────────────────────────────────────────────────────────┬───────────────┘
               │                                                         │
               ▼                                                         ▼
┌──────────────────────────────┐                         ┌──────────────────────────────┐
│ gl.nondet.web.render         │                         │ gl.vm.run_nondet             │
│ Live Telemetry Ingestion     │                         │ AI Hydrological Consensus    │
│                              │                         │                              │
│ • waterdata.usgs.gov         │                         │ • Leader LLM prompt eval     │
│ • land.copernicus.eu         │                         │ • Validator LLM equivalence  │
│ • water.noaa.gov             │                         │ • Decision Matrix Matching   │
│ • grdc.bafg.de               │                         │ • Consensus Exit Gate        │
└──────────────────────────────┘                         └──────────────────────────────┘
```

---

## 2. Policy State Lifecycle

```
[create_water_license_escrow]
               │
               ▼
       STATUS_POLICY_ACTIVE (0)
               │
      [trigger_depletion_claim] (USGS / Copernicus URL)
               │
               ▼
      STATUS_DEPLETION_ALERT (1)
               │
     [adjudicate_water_drawdown]
      (gl.nondet.web.render + AI Consensus)
               │
               ├─────────────────────────┐
               ▼                         ▼
      STATUS_AWAITING_PAYOUT (2)  STATUS_UNRESOLVED (8)
      (24-block / 72s cooling)     (Unreachable sensor / Canary error)
         │               │
         │ [appeal_verdict + 10% bond]
         │               │
         │               ▼
         │       STATUS_DISPUTED (6)
         │               │
         │      [adjudicate_appeal] (Supreme Hydrological Magistrate)
         │               │
         ▼               ▼
  [finalize_settlement]  ├─► STATUS_SETTLED_RELIEF_PAID (3) (100% relief)
                         ├─► STATUS_SETTLED_PARTIAL (4)     (40% penalty)
                         └─► STATUS_SETTLED_COMPLIANT (5)   (100% refund)
```

---

## 3. Hydrological Decision Rubric

The GenLayer AI Tribunal evaluates sensor data against the policy's Service Level Agreement:

| Condition | Threshold | Verdict | Action |
|---|---|---|---|
| **Severe Depletion** | Drawdown $\ge$ `max_tolerable_drawdown` OR Salinity $\ge$ `max_salinity_tds_ppm` | `AQUIFER_DEPLETION_CONFIRMED` | 100% indemnity escrow paid to community |
| **Moderate Drawdown** | $\frac{\text{max}}{2} \le \text{Drawdown} < \text{max}$ | `PARTIAL_DRAWDOWN_PENALTY` | 40% penalty to community, 60% preserved to enterprise |
| **Compliant / Recharged** | $\text{Drawdown} < \frac{\text{max}}{2}$ AND Salinity in normal range | `AQUIFER_COMPLIANT_CLEAN` | 100% escrow refunded to enterprise |
| **Telemetry Error** | Sensor offline / 404 / Canary mismatch | `UNRESOLVED_*` | Non-settling protected state; escrow preserved |

---

## 4. Appellate Review & Dispute Economics

- **Cooling-Off Challenge Window**: 24 blocks (~72 seconds) following initial verdict.
- **Economic Deterrence**: Appellant must stake a **10% dispute bond** (`dispute_bond = escrow * 0.10`).
- **Bound Supplemental Evidence**: Appellant must bind a accredited regional piezometer or satellite endpoint.
- **Resolution**:
  - **Upheld**: Bond returned to appellant + verdict amended.
  - **Dismissed**: Bond forfeited to counterparty + original verdict executed.
