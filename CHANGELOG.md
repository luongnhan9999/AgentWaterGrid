# Changelog

All notable changes to the **AgentWaterGrid** protocol and decentralized application are documented in this file.

## [1.0.0] - 2026-10-20

### Added
- **Intelligent Contract Core (`contracts/contract.py`)**:
  - `py-genlayer` pragma with `@allow_storage` and `TreeMap[str, WaterEscrowPolicy]` storage.
  - Multi-stakeholder water-rights escrow deposit (`create_water_license_escrow`).
  - Remote hydrological telemetry ingestion via `gl.nondet.web.render` targeting accredited water authorities (USGS, Copernicus, NOAA, GRDC).
  - Semantic non-deterministic consensus (`gl.vm.run_nondet`) comparing leader and validator outputs on piezometric water table drawdown and salinity PPM.
  - Multi-tier settlement matrix: `AQUIFER_DEPLETION_CONFIRMED` (100%), `PARTIAL_DRAWDOWN_PENALTY` (40% / 60%), `AQUIFER_COMPLIANT_CLEAN` (100% refund).
  - 24-block (~72 second) cooling-off challenge window with a mandatory 10% staked dispute bond (`appeal_verdict`).
  - Supreme Hydrological Appellate Tribunal re-evaluation (`adjudicate_appeal`).
  - Uncontested settlement execution after cooling window expiry (`finalize_settlement`).
  - Pull-payment safety withdrawal method (`claim_payout`) preventing stuck balances.
  - Fail-safe non-settling error state (`STATUS_UNRESOLVED`) for network timeouts and canary mismatches.
- **Pytest Test Suite (`tests/test_agentwatergrid.py`)**:
  - 12 comprehensive unit and integration tests passing in 0.12s.
  - Full end-to-end parametric relief disbursement verification.
  - Rejection of unaccredited telemetry sources.
  - Moderate drawdown warning penalty verification.
  - Compliant baseline verification and enterprise refund.
  - Appellate dispute bond staking and reversal verification.
  - Resilient `STATUS_UNRESOLVED` state verification under simulated 404 network failure.
  - Canary injection defense verification.
  - Reclaiming expired policy escrow verification.
  - Pull-payment buffered withdrawal testing.
- **Deployment Scripts (`scripts/deploy_studionet.py`)**:
  - Automated deployment script for GenLayer StudioNet (Chain ID: 61999).
  - Synchronous block receipt tracking and `deployment.json` receipt generation.
- **Full-Stack Web3 dApp (`frontend/`)**:
  - Built with React 18, Vite, TypeScript, and TailwindCSS.
  - "Hydrological Command Console" theme with Clean Hydro Deep Blue (`#080E1A`), elevated marine cards (`#111C2E`), and aquatic cyan accents.
  - Real-time GenLayer StudioNet RPC and MetaMask integration (`genlayer-js` + `viem`).
  - Live policy dashboard with interactive drawdown meters and mineral salinity gauges.
  - Dedicated modals: `CreatePolicyModal`, `TriggerClaimModal`, `HydroInspectorModal`, and `AppealModal`.
  - Pull-payment withdrawal interface (`PullPayoutButton`).
