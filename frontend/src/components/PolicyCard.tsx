import React from 'react';
import {
  Droplet,
  Layers,
  AlertTriangle,
  Scale,
  Eye,
  CheckCircle2,
  Clock,
  Shield,
  ExternalLink,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import {
  WaterPolicyData,
  STATUS_POLICY_ACTIVE,
  STATUS_DEPLETION_ALERT,
  STATUS_AWAITING_PAYOUT,
  STATUS_DISPUTED,
  STATUS_UNRESOLVED,
} from '../config/genlayer';
import {
  formatGen,
  shortenAddress,
  formatTimestamp,
  formatDrawdown,
  formatSalinity,
  getStatusMetadata,
} from '../utils/formatters';

interface PolicyCardProps {
  policy: WaterPolicyData;
  onOpenTriggerClaim: (policy: WaterPolicyData) => void;
  onOpenInspector: (policy: WaterPolicyData) => void;
  onOpenAppeal: (policy: WaterPolicyData) => void;
  userAddress: string;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({
  policy,
  onOpenTriggerClaim,
  onOpenInspector,
  onOpenAppeal,
  userAddress,
}) => {
  const statusMeta = getStatusMetadata(policy.status);
  const escrowGen = formatGen(policy.escrow_amount);
  const salinityInfo = formatSalinity(policy.measured_salinity_ppm);

  // Time calculations
  const nowSecs = Math.floor(Date.now() / 1000);
  const auditCompleted = Number(policy.audit_completed_time);
  const coolingExpiry = auditCompleted > 0 ? auditCompleted + 72 : 0;
  const isCoolingActive = policy.status === STATUS_AWAITING_PAYOUT && nowSecs <= coolingExpiry;
  const coolingSecondsRemaining = Math.max(0, coolingExpiry - nowSecs);

  // User roles
  const isEnterprise = userAddress && policy.enterprise.toLowerCase() === userAddress.toLowerCase();
  const isCommunityRep = userAddress && policy.community_rep.toLowerCase() === userAddress.toLowerCase();

  return (
    <div
      className={`rounded-2xl bg-hydro-800/90 border ${statusMeta.borderClass} p-5 sm:p-6 shadow-xl transition-all duration-300 hover:shadow-2xl space-y-4`}
    >
      {/* Top Header: Basin & Status Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs text-aquatic-cyan font-bold tracking-wider">
              POLICY #{policy.policy_id}
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-heading font-bold text-lg text-white tracking-tight flex items-center">
              <Layers className="w-4 h-4 mr-1.5 text-aquatic-cyan" />
              {policy.aquifer_basin_id}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">{statusMeta.description}</p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${statusMeta.badgeClass}`}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Main SLA / Physical Measurements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-hydro-900/90 border border-hydro-750">
        {/* Metric 1: Indemnity Escrow Locked */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400">Indemnity Escrow</span>
          <div className="flex items-baseline space-x-1">
            <span className="font-mono text-lg font-bold text-compliant-emerald">{escrowGen}</span>
            <span className="text-[11px] font-mono text-slate-400">GEN</span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            Enterprise: {shortenAddress(policy.enterprise, 4)}
          </span>
        </div>

        {/* Metric 2: Drawdown Drop Meter */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-mono uppercase text-slate-400">
            <span>Water Table Drop</span>
            <span>Limit: {policy.max_tolerable_drawdown_m}cm</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span
              className={`font-mono text-lg font-bold ${
                policy.measured_drawdown_cm >= policy.max_tolerable_drawdown_m
                  ? 'text-depletion-red'
                  : policy.measured_drawdown_cm > 0
                  ? 'text-penalty-amber'
                  : 'text-white'
              }`}
            >
              {policy.measured_drawdown_cm > 0 ? `${policy.measured_drawdown_cm} cm` : 'Normal'}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {policy.measured_drawdown_cm > 0 && `(${(policy.measured_drawdown_cm / 100).toFixed(2)}m)`}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-hydro-800 overflow-hidden">
            <div
              className={`h-full ${
                policy.measured_drawdown_cm >= policy.max_tolerable_drawdown_m
                  ? 'bg-depletion-red'
                  : 'bg-aquatic-cyan'
              }`}
              style={{
                width: `${Math.min(100, (policy.measured_drawdown_cm / (policy.max_tolerable_drawdown_m || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 3: Salinity TDS PPM */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-mono uppercase text-slate-400">
            <span>Salinity (TDS)</span>
            <span>Limit: {policy.max_salinity_tds_ppm}ppm</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span
              className={`font-mono text-lg font-bold ${
                policy.measured_salinity_ppm >= policy.max_salinity_tds_ppm
                  ? 'text-depletion-red'
                  : policy.measured_salinity_ppm > 0
                  ? 'text-penalty-amber'
                  : 'text-white'
              }`}
            >
              {policy.measured_salinity_ppm > 0 ? `${policy.measured_salinity_ppm} PPM` : 'Clean'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            {policy.measured_salinity_ppm > 0 ? salinityInfo.text : 'Drinking Water Compliant'}
          </span>
        </div>
      </div>

      {/* Stakeholders & Timestamps */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
        <div className="flex items-center space-x-2">
          <span>Beneficiary:</span>
          <span className="text-aquatic-cyan font-semibold">
            {shortenAddress(policy.community_rep, 4)}
          </span>
          {isCommunityRep && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-aquatic-cyan/15 text-aquatic-cyan">
              YOU
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span>Expires: {formatTimestamp(policy.expires_at_time)}</span>
        </div>
      </div>

      {/* Cooling-off notice if active */}
      {isCoolingActive && (
        <div className="p-2.5 rounded-xl bg-penalty-amber/10 border border-penalty-amber/30 text-xs font-mono text-penalty-amber flex items-center justify-between">
          <span className="flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Cooling-Off Window Active
          </span>
          <span className="font-bold">{coolingSecondsRemaining}s remaining</span>
        </div>
      )}

      {/* Card Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-hydro-750">
        {/* Trigger Alert (community rep can file) */}
        {(policy.status === STATUS_POLICY_ACTIVE || policy.status === STATUS_UNRESOLVED) && (
          <button
            onClick={() => onOpenTriggerClaim(policy)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-penalty-amber/20 hover:bg-penalty-amber/30 text-penalty-amber border border-penalty-amber/40 text-xs font-mono font-semibold transition"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>File Depletion Claim</span>
          </button>
        )}

        {/* Appeal button if awaiting payout and cooling active */}
        {policy.status === STATUS_AWAITING_PAYOUT && isCoolingActive && (
          <button
            onClick={() => onOpenAppeal(policy)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 border border-purple-500/40 text-xs font-mono font-semibold transition"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Appeal Verdict</span>
          </button>
        )}

        {/* Inspect Dossier Button */}
        <button
          onClick={() => onOpenInspector(policy)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-hydro-750 hover:bg-hydro-700 text-slate-200 hover:text-white border border-hydro-600 text-xs font-mono transition"
        >
          <Eye className="w-3.5 h-3.5 text-aquatic-cyan" />
          <span>Inspect AI Tribunal</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
