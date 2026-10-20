import React from 'react';
import {
  Droplet,
  Layers,
  Activity,
  CheckCircle2,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  Waves,
} from 'lucide-react';
import { GridStats } from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface StatsOverviewProps {
  stats: GridStats | null;
  onOpenCreateModal: () => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  onOpenCreateModal,
  activeFilter,
  onFilterChange,
}) => {
  const lockedGen = stats?.total_water_locked ? formatGen(stats.total_water_locked) : '0.000';
  const totalPolicies = Number(stats?.total_policies ?? 0);
  const settledPolicies = Number(stats?.total_policies_settled ?? 0);

  return (
    <div className="space-y-6">
      {/* Industrial Hero Command Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cleantech-950 via-cleantech-900 to-cleantech-850 border border-cleantech-700/80 p-6 sm:p-8 md:p-10 shadow-cockpit">
        <div className="absolute top-0 right-0 w-96 h-96 bg-mint-neon/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-aqua-cyan/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-3.5">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-mint-neon/10 border border-mint-neon/30 text-mint-neon text-xs font-mono font-semibold">
              <Waves className="w-3.5 h-3.5 animate-pulse" />
              <span>CLEANTECH DePIN • ON-CHAIN PARAMETRIC WATER ESCROW</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Autonomous Desalination & Aquifer Depletion Grid
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-sans">
              Parametric water-rights insurance on <strong className="text-white">GenLayer StudioNet</strong>. Industrial water consumers lock indemnity funds guaranteeing extraction SLAs. An autonomous on-chain AI Tribunal validates live piezometric telemetry from <strong className="text-mint-neon">USGS NWIS</strong> and <strong className="text-aqua-cyan">Copernicus</strong> to disburse automatic drought relief grants without centralized oracles.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <button
              onClick={onOpenCreateModal}
              className="flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-mint-neon to-aqua-cyan hover:opacity-95 text-cleantech-950 font-heading font-extrabold text-sm tracking-wider uppercase transition shadow-mint-glow"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create Water Escrow</span>
            </button>
            <a
              href="https://waterdata.usgs.gov/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center space-x-2 px-5 py-4 rounded-2xl bg-cleantech-850 hover:bg-cleantech-800 border border-cleantech-700 text-slate-200 hover:text-white text-xs font-mono transition"
            >
              <span>Live USGS NWIS</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Grid Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-cleantech-850/90 border border-cleantech-700/80 shadow-lg hover:border-mint-neon/50 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Indemnity Locked</span>
            <div className="p-2 rounded-xl bg-mint-neon/15 text-mint-neon">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-extrabold text-white">{lockedGen}</span>
            <span className="text-xs font-mono font-bold text-mint-neon">GEN</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Locked on StudioNet for groundwater depletion indemnity
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-cleantech-850/90 border border-cleantech-700/80 shadow-lg hover:border-aqua-cyan/50 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Monitored Aquifer Basins</span>
            <div className="p-2 rounded-xl bg-aqua-cyan/15 text-aqua-cyan">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-extrabold text-white">{totalPolicies}</span>
            <span className="text-xs font-mono text-slate-400">Basins Active</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Real-time piezometer drop & mineral salinity telemetry
          </p>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-cleantech-850/90 border border-cleantech-700/80 shadow-lg hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Relief Settlements</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-extrabold text-white">{settledPolicies}</span>
            <span className="text-xs font-mono text-emerald-400">Grants Paid</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Uncontested payouts executed past 24-block challenge window
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-cleantech-850/90 border border-cleantech-700/80 shadow-lg hover:border-warning-amber/50 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Accredited Water Oracles</span>
            <div className="p-2 rounded-xl bg-warning-amber/15 text-warning-amber">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-mono text-2xl font-extrabold text-white">8 Whitelisted</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            USGS • Copernicus • NOAA • GRDC • UK Environment Agency
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-cleantech-750 pb-3 overflow-x-auto">
        <span className="text-xs font-mono text-slate-400 uppercase mr-2 tracking-wider">Filter Policies:</span>
        {[
          { id: 'ALL', label: 'All Aquifers' },
          { id: 'ACTIVE', label: 'Active Monitored' },
          { id: 'ALERTS', label: 'Depletion Alerts' },
          { id: 'SETTLED', label: 'Settled Relief' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition ${
              activeFilter === tab.id
                ? 'bg-mint-neon text-cleantech-950 font-bold shadow-mint-glow'
                : 'bg-cleantech-850 text-slate-300 hover:text-white hover:bg-cleantech-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};
