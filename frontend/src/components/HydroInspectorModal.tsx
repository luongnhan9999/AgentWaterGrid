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
  const auditCompleted = Number(policy.audit_completed_time);
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

  const handleReclaim = async () => {
    setActionError('');
    setLoadingAction('reclaim');
    try {
      const hash = await writeContractWithMetaMask('cancel_or_reclaim', [policy.policy_id]);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl my-8 p-6 md:p-8 rounded-2xl bg-hydro-850 border border-hydro-700 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-xl bg-aquatic-cyan/15 text-aquatic-cyan border border-aquatic-cyan/30 shadow-hydro-glow">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-heading text-xl font-bold text-white">AI Hydrology Tribunal Dossier</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border font-semibold ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Basin: <span className="font-mono text-white font-semibold">{policy.aquifer_basin_id}</span> • Policy #{policy.policy_id}
            </p>
          </div>
        </div>

        {/* Core Physical Measurements Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Gauge 1: Water Table Drawdown */}
          <div className="p-4 rounded-xl bg-hydro-800 border border-hydro-700 space-y-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Piezometric Drawdown</span>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-white">
                {policy.measured_drawdown_cm > 0 ? formatDrawdown(policy.measured_drawdown_cm) : '0 cm'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                SLA: &le; {policy.max_tolerable_drawdown_m} cm
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-2 rounded-full bg-hydro-900 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  policy.measured_drawdown_cm >= policy.max_tolerable_drawdown_m
                    ? 'bg-depletion-red'
                    : policy.measured_drawdown_cm >= policy.max_tolerable_drawdown_m / 2
                    ? 'bg-penalty-amber'
                    : 'bg-compliant-emerald'
                }`}
                style={{
                  width: `${Math.min(100, (policy.measured_drawdown_cm / (policy.max_tolerable_drawdown_m || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Gauge 2: Salinity TDS PPM */}
          <div className="p-4 rounded-xl bg-hydro-800 border border-hydro-700 space-y-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Mineral Salinity (TDS)</span>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-white">
                {policy.measured_salinity_ppm > 0 ? `${policy.measured_salinity_ppm} PPM` : '0 PPM'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Max: {policy.max_salinity_tds_ppm} PPM
              </span>
            </div>

            <div className="text-[11px] font-mono font-medium">
              <span
                className={
                  salinityInfo.safety === 'SAFE'
                    ? 'text-compliant-emerald'
                    : salinityInfo.safety === 'WARNING'
                    ? 'text-penalty-amber'
                    : 'text-depletion-red'
                }
              >
                {salinityInfo.text}
              </span>
            </div>
          </div>
        </div>

        {/* AI Jury Verdict and Reasoning */}
        <div className="p-4 rounded-xl bg-hydro-900 border border-hydro-750 space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-aquatic-cyan flex items-center">
              <Scale className="w-4 h-4 mr-1.5" />
              Consensus Verdict: <span className="font-bold text-white ml-1">{policy.verdict}</span>
            </span>
            {policy.confidence > 0 && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-hydro-800 text-slate-300 border border-hydro-700">
                Confidence: <strong className="text-white">{policy.confidence}%</strong>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 font-sans leading-relaxed bg-hydro-850 p-3 rounded-lg border border-hydro-800">
            {policy.reason || 'No adjudication rationale recorded yet.'}
          </p>

          {/* Telemetry URL & Hash */}
          <div className="space-y-1.5 text-[11px] font-mono">
            {policy.hydrology_feed_url && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Oracle Feed:</span>
                <a
                  href={policy.hydrology_feed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-aquatic-cyan hover:underline flex items-center truncate max-w-xs"
                >
                  <span className="truncate">{policy.hydrology_feed_url}</span>
                  <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
                </a>
              </div>
            )}
            {policy.evidence_hash && policy.evidence_hash !== '0'.repeat(64) && (
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center">
                  <Hash className="w-3 h-3 mr-1 text-slate-500" /> SHA-256 Digest:
                </span>
                <span className="text-slate-300 font-mono text-[10px]">
                  {shortenAddress(policy.evidence_hash, 10)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stakeholder Details */}
        <div className="p-3 rounded-xl bg-hydro-800/80 border border-hydro-700 text-xs font-mono space-y-1.5 mb-6">
          <div className="flex justify-between">
            <span className="text-slate-400">Enterprise Operator:</span>
            <span className="text-white">{shortenAddress(policy.enterprise, 6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Community Representative:</span>
            <span className="text-aquatic-cyan">{shortenAddress(policy.community_rep, 6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Locked Indemnity Escrow:</span>
            <span className="text-compliant-emerald font-bold">{formatGen(policy.escrow_amount)} GEN</span>
          </div>
          {BigInt(policy.dispute_bond) > 0n && (
            <div className="flex justify-between">
              <span className="text-slate-400">Dispute Bond Staked (10%):</span>
              <span className="text-purple-400 font-bold">{formatGen(policy.dispute_bond)} GEN</span>
            </div>
          )}
        </div>

        {/* Action / Error Banner */}
        {actionError && (
          <div className="mb-4 p-3 rounded-lg bg-depletion-red/10 border border-depletion-red/40 text-depletion-red text-xs">
            {actionError}
          </div>
        )}
        {actionTx && (
          <div className="mb-4 p-3 rounded-lg bg-aquatic-cyan/10 border border-aquatic-cyan/40 text-aquatic-cyan text-xs font-mono truncate">
            Tx Submitted: {actionTx}
          </div>
        )}

        {/* Modal Dynamic Actions based on status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-hydro-750">
          <div className="text-xs text-slate-400 font-mono">
            {isCoolingActive && (
              <span className="flex items-center text-penalty-amber">
                <Clock className="w-3.5 h-3.5 mr-1 animate-spin" />
                Cooling-off window: {coolingSecondsRemaining}s remaining
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Action 1: Adjudicate if alert is filed */}
            {(policy.status === STATUS_DEPLETION_ALERT || policy.status === STATUS_UNRESOLVED) && (
              <button
                onClick={handleAdjudicate}
                disabled={loadingAction !== null}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-aquatic-cyan to-aquatic-blue hover:from-cyan-400 hover:to-blue-500 text-hydro-950 font-heading font-bold text-xs uppercase tracking-wider transition shadow-hydro-glow disabled:opacity-50"
              >
                {loadingAction === 'adjudicate' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating Telemetry...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    <span>Run AI Adjudication</span>
                  </>
                )}
              </button>
            )}

            {/* Action 2: Appeal if cooling-off active */}
            {policy.status === STATUS_AWAITING_PAYOUT && isCoolingActive && (
              <button
                onClick={() => onOpenAppeal(policy)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500 text-purple-200 font-heading font-bold text-xs uppercase tracking-wider transition"
              >
                <Scale className="w-4 h-4" />
                <span>Appeal Verdict (10% Bond)</span>
              </button>
            )}

            {/* Action 3: Finalize if cooling-off concluded */}
            {policy.status === STATUS_AWAITING_PAYOUT && !isCoolingActive && (
              <button
                onClick={handleFinalize}
                disabled={loadingAction !== null}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-compliant-emerald hover:bg-emerald-400 text-hydro-950 font-heading font-bold text-xs uppercase tracking-wider transition shadow-compliant-glow disabled:opacity-50"
              >
                {loadingAction === 'finalize' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Finalizing Payout...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Finalize Settlement Payout</span>
                  </>
                )}
              </button>
            )}

            {/* Action 4: Reclaim if expired or unresolved */}
            {(policy.status === STATUS_POLICY_ACTIVE || policy.status === STATUS_UNRESOLVED) &&
              nowSecs >= Number(policy.expires_at_time) && (
                <button
                  onClick={handleReclaim}
                  disabled={loadingAction !== null}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-hydro-800 hover:bg-hydro-750 border border-hydro-600 text-slate-200 font-mono text-xs transition"
                >
                  <Coins className="w-4 h-4" />
                  <span>Reclaim Expired Escrow</span>
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
