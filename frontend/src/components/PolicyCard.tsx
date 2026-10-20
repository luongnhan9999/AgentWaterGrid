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
  Cpu,
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
  const statusMeta = getStatusMetadata(policy?.status);
  const escrowGen = formatGen(policy?.escrow_amount);
  const salinityInfo = formatSalinity(policy?.measured_salinity_ppm);

  // Time calculations
  const nowSecs = Math.floor(Date.now() / 1000);
  const auditCompleted = Number(policy?.audit_completed_time || 0);
  const coolingExpiry = auditCompleted > 0 ? auditCompleted + 72 : 0;
  const isCoolingActive = policy?.status === STATUS_AWAITING_PAYOUT && nowSecs <= coolingExpiry;
  const coolingSecondsRemaining = Math.max(0, coolingExpiry - nowSecs);

  // Safe user role checks
  const uAddr = String(userAddress || '').toLowerCase().trim();
  const entAddr = String(policy?.enterprise || '').toLowerCase().trim();
  const commAddr = String(policy?.community_rep || '').toLowerCase().trim();

  const isEnterprise = uAddr !== '' && entAddr === uAddr;
  const isCommunityRep = uAddr !== '' && commAddr === uAddr;

  const maxDrawdown = Number(policy?.max_tolerable_drawdown_m || 150);
  const measuredDrawdown = Number(policy?.measured_drawdown_cm || 0);
  const maxSalinity = Number(policy?.max_salinity_tds_ppm || 500);
  const measuredSalinity = Number(policy?.measured_salinity_ppm || 0);

  return (
    <div
      className={`rounded-2xl bg-cleantech-850/95 border ${statusMeta.borderClass} p-5 sm:p-6 shadow-xl transition-all duration-300 hover:shadow-2xl space-y-4`}
    >
      {/* Top Header: Basin & Status Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs text-mint-neon font-bold tracking-wider">
              POLICY #{policy?.policy_id}
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-heading font-bold text-lg text-white tracking-tight flex items-center">
              <Layers className="w-4 h-4 mr-1.5 text-aqua-cyan" />
              {policy?.aquifer_basin_id || 'UNKNOWN BASIN'}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-cleantech-950/90 border border-cleantech-750">
        {/* Metric 1: Indemnity Escrow Locked */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400">Indemnity Escrow</span>
          <div className="flex items-baseline space-x-1">
            <span className="font-mono text-xl font-extrabold text-mint-neon">{escrowGen}</span>
            <span className="text-[11px] font-mono text-slate-400">GEN</span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            Enterprise: {shortenAddress(policy?.enterprise, 4)}
          </span>
        </div>

        {/* Metric 2: Drawdown Drop Meter */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-mono uppercase text-slate-400">
            <span>Water Table Drop</span>
            <span>Limit: {maxDrawdown}cm</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span
              className={`font-mono text-lg font-bold ${
                measuredDrawdown >= maxDrawdown
                  ? 'text-danger-crimson'
                  : measuredDrawdown > 0
                  ? 'text-warning-amber'
                  : 'text-white'
              }`}
            >
              {measuredDrawdown > 0 ? `${measuredDrawdown} cm` : 'Normal'}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {measuredDrawdown > 0 && `(${(measuredDrawdown / 100).toFixed(2)}m)`}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-cleantech-800 overflow-hidden">
            <div
              className={`h-full ${
                measuredDrawdown >= maxDrawdown
                  ? 'bg-danger-crimson'
                  : 'bg-mint-neon'
              }`}
              style={{
                width: `${Math.min(100, (measuredDrawdown / (maxDrawdown || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 3: Salinity TDS PPM */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-mono uppercase text-slate-400">
            <span>Salinity (TDS)</span>
            <span>Limit: {maxSalinity}ppm</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span
              className={`font-mono text-lg font-bold ${
                measuredSalinity >= maxSalinity
                  ? 'text-danger-crimson'
                  : measuredSalinity > 0
                  ? 'text-warning-amber'
                  : 'text-white'
              }`}
            >
              {measuredSalinity > 0 ? `${measuredSalinity} PPM` : 'Clean'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            {measuredSalinity > 0 ? salinityInfo.text : 'EPA Potable Compliant'}
          </span>
        </div>
      </div>

      {/* Stakeholders & Timestamps */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
        <div className="flex items-center space-x-2">
          <span>Beneficiary:</span>
          <span className="text-aqua-cyan font-semibold">
            {shortenAddress(policy?.community_rep, 4)}
          </span>
          {isCommunityRep && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-mint-neon/15 text-mint-neon border border-mint-neon/30">
              YOU
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span>Coverage: {formatTimestamp(policy?.expires_at_time)}</span>
        </div>
      </div>

      {/* Cooling-off notice if active */}
      {isCoolingActive && (
        <div className="p-2.5 rounded-xl bg-warning-amber/10 border border-warning-amber/30 text-xs font-mono text-warning-amber flex items-center justify-between">
          <span className="flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            24-Block Cooling Challenge Window Active
          </span>
          <span className="font-bold">{coolingSecondsRemaining}s remaining</span>
        </div>
      )}

      {/* Card Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-cleantech-750">
        {/* Trigger Alert (community rep or any observer can file) */}
        {(policy?.status === STATUS_POLICY_ACTIVE || policy?.status === STATUS_UNRESOLVED) && (
          <button
            onClick={() => onOpenTriggerClaim(policy)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-warning-amber/15 hover:bg-warning-amber/25 text-warning-amber border border-warning-amber/40 text-xs font-mono font-semibold transition"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>File Depletion Alert</span>
          </button>
        )}

        {/* Appeal button if awaiting payout and cooling active */}
        {policy?.status === STATUS_AWAITING_PAYOUT && isCoolingActive && (
          <button
            onClick={() => onOpenAppeal(policy)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 border border-purple-500/40 text-xs font-mono font-semibold transition"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Appeal Verdict</span>
          </button>
        )}

        {/* Inspect Dossier Button */}
        <button
          onClick={() => onOpenInspector(policy)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cleantech-750 hover:bg-cleantech-700 text-slate-200 hover:text-white border border-cleantech-600 text-xs font-mono transition"
        >
          <Eye className="w-3.5 h-3.5 text-mint-neon" />
          <span>Inspect AI Tribunal</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
