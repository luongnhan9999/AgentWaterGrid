import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Clock,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Coins,
  Scale,
  Activity,
  Droplets,
  Terminal,
  FileCheck,
  Share2,
} from 'lucide-react';
import {
  WaterPolicyData,
  writeContractWithMetaMask,
  waitForTransactionReceipt,
  STATUS_POLICY_ACTIVE,
  STATUS_DEPLETION_ALERT,
  STATUS_AWAITING_PAYOUT,
  STATUS_SETTLED_RELIEF_PAID,
  STATUS_SETTLED_PARTIAL,
  STATUS_SETTLED_COMPLIANT,
  STATUS_DISPUTED,
  STATUS_EXPIRED_RECLAIMED,
  STATUS_UNRESOLVED,
} from '../config/genlayer';
import {
  formatGen,
  shortenAddress,
  formatTimestamp,
  getStatusMetadata,
} from '../utils/formatters';
import { AquiferCrossSection } from './AquiferCrossSection';

interface CommandCenterStageProps {
  policy: WaterPolicyData | null;
  onOpenTriggerClaim: (policy: WaterPolicyData) => void;
  onOpenAppeal: (policy: WaterPolicyData) => void;
  onSuccess: () => void;
  userAddress: string;
}

export const CommandCenterStage: React.FC<CommandCenterStageProps> = ({
  policy,
  onOpenTriggerClaim,
  onOpenAppeal,
  onSuccess,
  userAddress,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionTx, setActionTx] = useState('');

  if (!policy) {
    return (
      <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-obsidian-900 border border-obsidian-800 text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-neon-mint/10 border border-neon-mint/30 flex items-center justify-center text-neon-mint shadow-neon-glow">
          <Droplets className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <h3 className="font-heading font-bold text-lg text-white">Select a Monitored Aquifer Basin</h3>
          <p className="text-xs text-slate-400 font-mono">
            Select an active basin from the left column to launch full stratigraphy and AI consensus telemetries.
          </p>
        </div>
      </div>
    );
  }

  const meta = getStatusMetadata(policy.status);
  const nowSecs = Math.floor(Date.now() / 1000);
  const auditCompleted = Number(policy.audit_completed_time || 0);
  const coolingExpiry = auditCompleted > 0 ? auditCompleted + 72 : 0;
  const isCoolingActive = policy.status === STATUS_AWAITING_PAYOUT && nowSecs <= coolingExpiry;
  const coolingSecondsRemaining = Math.max(0, coolingExpiry - nowSecs);

  // Actions
  const handleAdjudicate = async () => {
    setActionError('');
    setLoadingAction('adjudicate');
    try {
      const hash = await writeContractWithMetaMask('adjudicate_water_drawdown', [policy.policy_id]);
      setActionTx(hash);
      await waitForTransactionReceipt(hash);
      onSuccess();
    } catch (err: any) {
      console.error('Adjudication error:', err);
      setActionError(err?.message || 'AI Tribunal adjudication failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleFinalize = async () => {
    setActionError('');
    setLoadingAction('finalize');
    try {
      const hash = await writeContractWithMetaMask('finalize_settlement', [policy.policy_id]);
      setActionTx(hash);
      await waitForTransactionReceipt(hash);
      onSuccess();
    } catch (err: any) {
      console.error('Finalization error:', err);
      setActionError(err?.message || 'Settlement finalization failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReclaim = async () => {
    setActionError('');
    setLoadingAction('reclaim');
    try {
      const hash = await writeContractWithMetaMask('reclaim_expired_escrow', [policy.policy_id]);
      setActionTx(hash);
      await waitForTransactionReceipt(hash);
      onSuccess();
    } catch (err: any) {
      console.error('Reclaim error:', err);
      setActionError(err?.message || 'Escrow reclaim failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  const isExpired = Number(policy.expires_at_time || 0) > 0 && nowSecs > Number(policy.expires_at_time);
  const canReclaim = policy.status === STATUS_POLICY_ACTIVE && isExpired;

  return (
    <div className="space-y-5">
      {/* Tactical Basin Header Card */}
      <div className="p-5 rounded-2xl bg-obsidian-900 border border-obsidian-750 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-obsidian-800 gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}`}>
                {meta.label}
              </span>
              <span className="text-xs font-mono text-slate-400">Policy #{policy.policy_id}</span>
              <span className="text-[10px] font-mono text-neon-mint bg-obsidian-950 px-2 py-0.5 rounded border border-obsidian-750">
                100% On-Chain Escrow
              </span>
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center">
              Aquifer Basin: {policy.aquifer_basin_id}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Underwritten Indemnity</div>
            <div className="text-2xl font-mono font-bold text-neon-mint">
              {formatGen(policy.escrow_amount)} GEN
            </div>
          </div>
        </div>

        {/* Counterparties & Duration Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-obsidian-950/80 border border-obsidian-800">
            <span className="text-slate-400 block text-[10px] uppercase">Industrial Enterprise</span>
            <span className="text-neon-cyan font-bold truncate block mt-0.5">
              {shortenAddress(policy.enterprise)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-950/80 border border-obsidian-800">
            <span className="text-slate-400 block text-[10px] uppercase">Community Water Board</span>
            <span className="text-neon-mint font-bold truncate block mt-0.5">
              {shortenAddress(policy.community_rep)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-950/80 border border-obsidian-800">
            <span className="text-slate-400 block text-[10px] uppercase">Coverage Window</span>
            <span className="text-slate-200 font-semibold block mt-0.5">
              {formatTimestamp(policy.expires_at_time)}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Aquifer Stratigraphy & Depth Gauge */}
      <AquiferCrossSection policy={policy} />

      {/* GenVM AI Tribunal Consensus Reasoning Terminal */}
      <div className="p-5 rounded-2xl bg-obsidian-900 border border-obsidian-750 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2 text-warning-amber font-semibold">
            <Cpu className="w-4 h-4 text-warning-amber" />
            <span>GenVM Multi-Validator Consensus Jury</span>
          </div>
          <div className="flex items-center space-x-2 text-[11px]">
            <span className="text-slate-400">Canary Verification:</span>
            <span className="text-neon-mint font-bold font-mono">CANARY_V1_VALID</span>
          </div>
        </div>

        {/* Console Box */}
        <div className="p-4 rounded-xl bg-obsidian-950 border border-obsidian-800 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-obsidian-800 pb-2">
            <span className="text-neon-mint font-bold">
              VERDICT: {policy.verdict || 'AWAITING_ORACLE_EVALUATION'}
            </span>
            <span className="text-[11px] text-slate-400">
              Confidence Score: <strong className="text-neon-mint">{policy.confidence}%</strong>
            </span>
          </div>

          <p className="text-slate-300 leading-relaxed text-[11px] whitespace-pre-wrap">
            {policy.reason || 'Telemetry endpoint active. No hydrological depletion breach reported.'}
          </p>

          {policy.hydrology_feed_url && (
            <div className="pt-2 border-t border-obsidian-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>Telemetry Feed Source:</span>
              <a
                href={policy.hydrology_feed_url}
                target="_blank"
                rel="noreferrer"
                className="text-neon-cyan hover:underline flex items-center truncate max-w-sm"
              >
                <span className="truncate">{policy.hydrology_feed_url}</span>
                <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Appellate Record (if active) */}
        {policy.dispute_initiator && (
          <div className="p-3 rounded-xl bg-warning-amber/10 border border-warning-amber/30 font-mono text-xs text-warning-amber flex items-center justify-between">
            <span className="flex items-center">
              <Scale className="w-4 h-4 mr-2" />
              Appellate Review Active (10% Staked Bond: {formatGen(policy.dispute_bond)} GEN)
            </span>
            <span className="text-slate-300">Appellant: {shortenAddress(policy.dispute_initiator)}</span>
          </div>
        )}

        {/* Cooling-off Notice */}
        {isCoolingActive && (
          <div className="p-3.5 rounded-xl bg-warning-amber/15 border border-warning-amber/40 text-xs font-mono text-warning-amber flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Cooling-off appellate buffer active (~72s). Counterparties may stake 10% to contest.</span>
            </div>
            <span className="font-bold">{coolingSecondsRemaining}s remaining</span>
          </div>
        )}

        {/* Action Status Output */}
        {actionError && (
          <div className="p-3 rounded-xl bg-alert-crimson/15 border border-alert-crimson/40 text-alert-crimson text-xs">
            {actionError}
          </div>
        )}
        {actionTx && (
          <div className="p-3 rounded-xl bg-neon-mint/15 border border-neon-mint/40 text-neon-mint text-xs font-mono truncate">
            On-Chain Consensus Tx: {actionTx}
          </div>
        )}
      </div>

      {/* Tactical Action Deck (Context-sensitive actions) */}
      <div className="p-5 rounded-2xl bg-obsidian-900 border border-obsidian-750 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-heading font-bold text-xs text-white uppercase tracking-wider block">
            Tactical Protocol Actions
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Current Status: <strong className="text-neon-mint">{meta.label}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Action 1: Report Depletion Breach (When Active) */}
          {policy.status === STATUS_POLICY_ACTIVE && (
            <button
              onClick={() => onOpenTriggerClaim(policy)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-alert-crimson to-pink-600 hover:from-pink-500 hover:to-pink-600 text-white font-heading font-bold text-xs uppercase tracking-wider transition shadow-lg"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>File Depletion / Salinity Alert</span>
            </button>
          )}

          {/* Action 2: Run AI Tribunal Adjudication (When Alert Filed) */}
          {policy.status === STATUS_DEPLETION_ALERT && (
            <button
              onClick={handleAdjudicate}
              disabled={loadingAction !== null}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-neon-mint to-neon-cyan hover:from-emerald-400 hover:to-cyan-400 text-obsidian-950 font-heading font-bold text-xs uppercase tracking-wider transition shadow-neon-glow disabled:opacity-50"
            >
              {loadingAction === 'adjudicate' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Hydro Telemetry...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>Run AI Tribunal Adjudication</span>
                </>
              )}
            </button>
          )}

          {/* Action 3: File Supreme Appeal (During cooling off) */}
          {policy.status === STATUS_AWAITING_PAYOUT && isCoolingActive && (
            <button
              onClick={() => onOpenAppeal(policy)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-warning-amber to-amber-600 hover:from-amber-400 hover:to-amber-500 text-obsidian-950 font-heading font-bold text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(255,184,0,0.3)]"
            >
              <Scale className="w-4 h-4" />
              <span>File Supreme Appeal (10% Bond)</span>
            </button>
          )}

          {/* Action 4: Finalize Settlement (When cooling off expired) */}
          {policy.status === STATUS_AWAITING_PAYOUT && !isCoolingActive && (
            <button
              onClick={handleFinalize}
              disabled={loadingAction !== null}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-neon-mint to-neon-cyan hover:from-emerald-400 hover:to-cyan-400 text-obsidian-950 font-heading font-bold text-xs uppercase tracking-wider transition shadow-neon-glow disabled:opacity-50"
            >
              {loadingAction === 'finalize' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Releasing Indemnity...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finalize & Release Indemnity</span>
                </>
              )}
            </button>
          )}

          {/* Action 5: Reclaim Expired Escrow */}
          {canReclaim && (
            <button
              onClick={handleReclaim}
              disabled={loadingAction !== null}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-obsidian-800 hover:bg-obsidian-750 text-neon-mint border border-neon-mint/30 font-heading font-bold text-xs uppercase tracking-wider transition disabled:opacity-50"
            >
              {loadingAction === 'reclaim' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reclaiming...</span>
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  <span>Reclaim Expired Escrow</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
