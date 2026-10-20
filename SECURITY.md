# Security Policy — AgentWaterGrid Protocol

## Threat Model & Defensive Mitigations

### 1. Adversarial Prompt Injection Defense
- **Attack Vector**: A malicious actor attempts to embed system prompt overrides or jailbreaks inside live hydrological sensor telemetry payloads.
- **Defense Mechanism**:
  - **Cryptographic Canary Token**: Every prompt evaluation strictly mandates echo verification of `CANARY_TOKEN = "CANARY_AGENT_WATER_GRID_V1"`.
  - If an injected payload causes the model to omit, alter, or corrupt the canary token, the contract immediately falls into `STATUS_UNRESOLVED` (`UNRESOLVED_CANARY_FAILED`).
  - Escrow funds are locked and preserved from premature or unauthorized disbursement.

### 2. Telemetry Source Spoofing
- **Attack Vector**: An attacker supplies a rogue sensor endpoint or private server serving fake water table depletion data.
- **Defense Mechanism**:
  - `_is_accredited_hydrological_source(url)` enforces strict domain whitelisting against accredited international hydrological monitoring authorities:
    - `waterdata.usgs.gov` / `usgs.gov`
    - `land.copernicus.eu` / `copernicus.eu`
    - `water.noaa.gov` / `noaa.gov`
    - `grdc.bafg.de` / `bafg.de`
    - `environment.data.gov.uk`
  - Any claim using an unaccredited URL reverts at the contract layer (`Telemetry unauthenticated`).

### 3. Sybil & Frivolous Claims
- **Attack Vector**: Spurious claims filed to lock enterprise funds or manipulate water rights markets.
- **Defense Mechanism**:
  - Role check: Only the designated `community_rep` can file a depletion claim.
  - Appeals require a mandatory **10% staked dispute bond** (`dispute_bond = escrow * 0.10`).
  - If an appeal is dismissed, the bond is forfeited directly to the counterparty.

### 4. Reentrancy & Double-Payout Elimination
- **Attack Vector**: Reentrant call or duplicate payout execution.
- **Defense Mechanism**:
  - Checks-Effects-Interactions: `escrow_amount` and `dispute_bond` are zeroed out (`p.escrow_amount = bigint(0)`) **before** triggering transfer.
  - Pull-payment fallback: If native transfer reverts or fails, the funds are safely buffered into `self.claimable_balances` for withdrawal via `claim_payout()`.

### 5. Cooling-Off Dispute Window
- An uncontested settlement cannot be finalized until **24 blocks (~72 seconds)** have elapsed after the AI jury renders its verdict.
- Any attempt to call `finalize_settlement()` prior to cooling window expiry reverts on-chain.
