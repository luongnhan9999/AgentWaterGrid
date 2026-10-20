import React, { useState } from 'react';
import {
  X,
  Cpu,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Scale,
  ExternalLink,
  Loader2,
  Clock,
  Hash,
  Coins,
  ArrowRight,
  Droplets,
  Activity,
  Terminal,
} from 'lucide-react';
import {
  WaterPolicyData,
  writeContractWithMetaMask,
  waitForTransactionReceipt,
  STATUS_DEPLETION_ALERT,
  STATUS_AWAITING_PAYOUT,
  STATUS_UNRESOLVED,
  STATUS_POLICY_ACTIVE,
} from '../config/genlayer';
import {
  formatGen,
  shortenAddress,
  formatTimestamp,
  formatDrawdown,
  formatSalinity,
  getStatusMetadata,
} from '../utils/formatters';

interface HydroInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: WaterPolicyData | null;
  onOpenAppeal: (policy: WaterPolicyData) => void;
  onSuccess: () => void;
  userAddress: string;
}

export const HydroInspectorModal: React.FC<HydroInspectorModalProps> = ({
  isOpen,
  onClose,
  policy,
  onOpenAppeal,
  onSuccess,
  userAddress,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionTx, setActionTx] = useState('');

  if (!isOpen || !policy) return null;

  const statusMeta = getStatusMetadata(policy.status);
  const salinityInfo = formatSalinity(policy.measured_salinity_ppm);

  // Time calculations
  const nowSecs = Math.floor(Date.now() / 1000);
  const auditCompleted = Number(policy.audit_completed_time || 0);
  const coolingExpiry = auditCompleted > 0 ? auditCompleted + 72 : 0;
  const isCoolingActive = policy.status === STATUS_AWAITING_PAYOUT && nowSecs <= coolingExpiry;
  const coolingSecondsRemaining = Math.max(0, coolingExpiry - nowSecs);

  // Handlers
  const handleAdjudicate = async () => {
    setActionError('');
    setLoadingAction('adjudicate');
    try {
      const hash = await writeContractWithMetaMask('adjudicate_water_drawdown', [policy.policy_id]);
      setActionTx(hash);
      await waitForTransactionReceipt(hash);
      onSuccess();
      onClose();
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
      onClose();
    } catch (err: any) {
      console.error('Finalization error:', err);
      setActionError(err?.message || 'Settlement finalization failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReclaimExpired = async () => {
    setActionError('');
    setLoadingAction('reclaim');
    try {
      const hash = await writeContractWithMetaMask('reclaim_expired_escrow', [policy.policy_id]);
      setActionTx(hash);
      await waitForTransactionReceipt(hash);
      onSuccess();
      onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl my-8 p-6 sm:p-8 rounded-2xl bg-obsidian-900 border border-obsidian-700 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-obsidian-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-obsidian-750 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
              <span className="text-xs font-mono text-slate-400">Policy #{policy.policy_id}</span>
            </div>
            <h2 className="font-heading text-xl font-bold text-white mt-1">
              Aquifer Basin: {policy.aquifer_basin_id}
            </h2>
          </div>

          <div className="text-right">
            <div className="text-xs font-mono text-slate-400 uppercase">Total Escrowed Value</div>
            <div className="text-xl font-mono font-bold text-neon-mint">
              {formatGen(policy.escrow_amount)} GEN
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-6 py-6">
          {/* Hydro Sensors Telemetry Card */}
          <div className="p-4 rounded-xl bg-obsidian-850 border border-obsidian-750 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neon-cyan flex items-center font-semibold">
                <Activity className="w-4 h-4 mr-1.5 text-neon-cyan" />
                Live Hydrological Telemetry Readout
              </span>
              {policy.evidence_hash && (
                <span className="text-[11px] text-slate-400 flex items-center font-mono">
                  <Hash className="w-3.5 h-3.5 mr-1" />
                  Hash: {policy.evidence_hash.slice(0, 10)}...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-obsidian-950/70 border border-obsidian-750">
                <div className="text-slate-400 mb-1">Measured Piezometric Head Drawdown</div>
                <div className="text-lg font-mono font-bold text-white flex items-center justify-between">
                  <span>{formatDrawdown(policy.measured_drawdown_cm)}</span>
                  <span className="text-xs font-normal text-slate-400">
                    SLA: &le; {policy.max_tolerable_drawdown_m} cm
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-obsidian-950/70 border border-obsidian-750">
                <div className="text-slate-400 mb-1">Total Dissolved Solids (TDS Salinity)</div>
                <div className="text-lg font-mono font-bold text-white flex items-center justify-between">
                  <span className={salinityInfo.safety === 'CRITICAL' ? 'text-alert-crimson' : 'text-neon-mint'}>
                    {policy.measured_salinity_ppm} PPM
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    SLA: &le; {policy.max_salinity_tds_ppm} PPM
                  </span>
                </div>
              </div>
            </div>

            {policy.hydrology_feed_url && (
              <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-300">
                <span className="text-slate-400">Telemetry Feed URL:</span>
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

          {/* AI Tribunal Consensus Verdict Card */}
          <div className="p-4 rounded-xl bg-obsidian-850 border border-obsidian-750 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-warning-amber flex items-center font-semibold">
                <Cpu className="w-4 h-4 mr-1.5 text-warning-amber" />
                GenLayer GenVM Consensus Reasoning
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Verdict Confidence: <strong className="text-neon-mint">{policy.confidence}%</strong>
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-obsidian-950/80 border border-obsidian-750 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
              <div className="text-neon-mint font-bold mb-1">
                STATUS: {policy.verdict || 'AWAITING_ORACLE_EVALUATION'}
              </div>
              <div>{policy.reason || 'No breach recorded or awaiting sensor ingestion.'}</div>
            </div>

            {/* Appeal Record if present */}
            {policy.dispute_initiator && (
              <div className="p-3 rounded-lg bg-obsidian-950/50 border border-warning-amber/30 text-xs font-mono space-y-1">
                <div className="flex items-center justify-between text-warning-amber">
                  <span className="flex items-center">
                    <Scale className="w-3.5 h-3.5 mr-1" />
                    Appellate Stake Bond:
                  </span>
                  <span>{formatGen(policy.dispute_bond)} GEN (10%)</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Appellant: <span className="text-slate-200">{shortenAddress(policy.dispute_initiator)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Lifecycle & Counterparties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-obsidian-850 border border-obsidian-750 space-y-2">
              <div className="text-slate-400 font-semibold uppercase text-[11px]">Protocol Counterparties</div>
              <div className="flex justify-between">
                <span className="text-slate-400">Enterprise Operator:</span>
                <span className="text-neon-cyan">{shortenAddress(policy.enterprise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Community Water Board:</span>
                <span className="text-neon-mint">{shortenAddress(policy.community_rep)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-obsidian-850 border border-obsidian-750 space-y-2">
              <div className="text-slate-400 font-semibold uppercase text-[11px]">Lifecycle Timestamps</div>
              <div className="flex justify-between">
                <span className="text-slate-400">Escrow Created:</span>
                <span className="text-slate-200">{formatTimestamp(policy.created_at_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Coverage Concludes:</span>
                <span className="text-slate-200">{formatTimestamp(policy.expires_at_time)}</span>
              </div>
            </div>
          </div>

          {/* Cooling-off Notice */}
          {isCoolingActive && (
            <div className="p-4 rounded-xl bg-warning-amber/10 border border-warning-amber/30 text-xs font-mono text-warning-amber flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Cooling-off appellate buffer active (~72s). Community & Enterprise may contest.</span>
              </div>
              <span className="font-bold">{coolingSecondsRemaining}s remaining</span>
            </div>
          )}

          {/* Action Messages */}
          {actionError && (
            <div className="p-3 rounded-xl bg-alert-crimson/15 border border-alert-crimson/40 text-alert-crimson text-xs">
              {actionError}
            </div>
          )}
          {actionTx && (
            <div className="p-3 rounded-xl bg-neon-mint/15 border border-neon-mint/40 text-neon-mint text-xs font-mono truncate">
              Consensus Broadcasted: {actionTx}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-obsidian-750 flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition hover:bg-obsidian-800"
          >
            Close Inspector
          </button>

          {/* Action: Trigger Adjudication */}
          {policy.status === STATUS_DEPLETION_ALERT && (
            <button
              onClick={handleAdjudicate}
              disabled={loadingAction !== null}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-mint to-neon-cyan hover:from-emerald-400 hover:to-cyan-400 text-obsidian-950 font-heading font-bold text-xs uppercase tracking-wide transition shadow-neon-glow disabled:opacity-50"
            >
              {loadingAction === 'adjudicate' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Telemetry...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>Run AI Tribunal Adjudication</span>
                </>
              )}
            </button>
          )}

          {/* Action: Appeal during cooling-off */}
          {policy.status === STATUS_AWAITING_PAYOUT && isCoolingActive && (
            <button
              onClick={() => onOpenAppeal(policy)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-warning-amber to-amber-600 hover:from-amber-400 hover:to-amber-500 text-obsidian-950 font-heading font-bold text-xs uppercase tracking-wide transition shadow-[0_0_15px_rgba(255,184,0,0.3)]"
            >
              <Scale className="w-4 h-4" />
              <span>File Supreme Appeal (10% Bond)</span>
            </button>
          )}

          {/* Action: Finalize Settlement */}
          {policy.status === STATUS_AWAITING_PAYOUT && !isCoolingActive && (
            <button
              onClick={handleFinalize}
              disabled={loadingAction !== null}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-mint to-neon-cyan text-obsidian-950 font-heading font-bold text-xs uppercase tracking-wide transition shadow-neon-glow disabled:opacity-50"
            >
              {loadingAction === 'finalize' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Finalizing Settlement...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Finalize & Release Indemnity</span>
                </>
              )}
            </button>
          )}

          {/* Action: Reclaim Expired */}
          {canReclaim && (
            <button
              onClick={handleReclaimExpired}
              disabled={loadingAction !== null}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-obsidian-800 hover:bg-obsidian-750 text-neon-mint border border-neon-mint/30 font-heading font-bold text-xs uppercase tracking-wide transition disabled:opacity-50"
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
