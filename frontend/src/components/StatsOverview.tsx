import React from 'react';
import {
  ShieldAlert,
  Droplet,
  Layers,
  Activity,
  CheckCircle2,
  TrendingDown,
  PlusCircle,
  ExternalLink,
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
  const lockedGen = stats?.total_water_locked ? formatGen(stats.total_water_locked) : '0';
  const totalPolicies = stats?.total_policies ?? 0;
  const settledPolicies = stats?.total_policies_settled ?? 0;

  return (
    <div className="space-y-6">
      {/* Hero Banner with CleanTech Mission */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-hydro-850 via-hydro-800 to-hydro-850 border border-hydro-700 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-aquatic-cyan/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-aquatic-blue/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-aquatic-cyan/10 border border-aquatic-cyan/30 text-aquatic-cyan text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-aquatic-cyan animate-pulse" />
              <span>PARAMETRIC ENVIRONMENTAL ORACLE ESCROW</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              Autonomous Desalination & Aquifer Depletion Relief Grid
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              Decentralized physical water infrastructure (DePIN) protecting municipal groundwaters from industrial depletion.
              GenLayer AI Consensus evaluates real-time piezometric telemetry from USGS & Copernicus to trigger automatic indemnity payouts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <button
              onClick={onOpenCreateModal}
              className="flex items-center justify-center space-x-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-aquatic-cyan to-aquatic-blue hover:from-cyan-400 hover:to-blue-500 text-hydro-950 font-heading font-bold text-sm tracking-wide transition shadow-hydro-glow"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Lock Water Escrow</span>
            </button>
            <a
              href="https://waterdata.usgs.gov/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center space-x-2 px-4 py-3.5 rounded-xl bg-hydro-800 hover:bg-hydro-750 border border-hydro-600 text-slate-300 hover:text-white text-xs font-mono transition"
            >
              <span>USGS Telemetry</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Grid Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Water Escrow Locked */}
        <div className="p-5 rounded-xl bg-hydro-800/90 border border-hydro-700/80 shadow-lg hover:border-aquatic-cyan/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase text-slate-400">Total Indemnity Locked</span>
            <div className="p-2 rounded-lg bg-aquatic-cyan/10 text-aquatic-cyan">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-mono text-2xl font-bold text-white">{lockedGen}</span>
            <span className="text-xs font-mono font-semibold text-aquatic-cyan">GEN</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Backed by industrial desalination & semiconductor water rights
          </p>
        </div>

        {/* Metric 2: Monitored Basins */}
        <div className="p-5 rounded-xl bg-hydro-800/90 border border-hydro-700/80 shadow-lg hover:border-aquatic-cyan/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase text-slate-400">Monitored Aquifer Basins</span>
            <div className="p-2 rounded-lg bg-aquatic-blue/10 text-aquatic-blue">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-mono text-2xl font-bold text-white">{totalPolicies}</span>
            <span className="text-xs font-mono text-slate-400">Basins Active</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Piezometric water table drop & salinity PPM surveillance
          </p>
        </div>

        {/* Metric 3: Settlements Finalized */}
        <div className="p-5 rounded-xl bg-hydro-800/90 border border-hydro-700/80 shadow-lg hover:border-compliant-emerald/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase text-slate-400">Relief Grants Settled</span>
            <div className="p-2 rounded-lg bg-compliant-emerald/10 text-compliant-emerald">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-mono text-2xl font-bold text-white">{settledPolicies}</span>
            <span className="text-xs font-mono text-compliant-emerald">Audits Concluded</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Uncontested payouts executed past 24-block challenge window
          </p>
        </div>

        {/* Metric 4: Accredited Telemetry */}
        <div className="p-5 rounded-xl bg-hydro-800/90 border border-hydro-700/80 shadow-lg hover:border-penalty-amber/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase text-slate-400">Oracle Security Standard</span>
            <div className="p-2 rounded-lg bg-penalty-amber/10 text-penalty-amber">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-mono text-xl font-bold text-white">8 Whitelisted</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            USGS • Copernicus • NOAA • GRDC • UK Environment Agency
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-hydro-750 pb-3 overflow-x-auto">
        <span className="text-xs font-mono text-slate-400 uppercase mr-2">Filter Basins:</span>
        {[
          { id: 'ALL', label: 'All Policies' },
          { id: 'ACTIVE', label: 'Active Monitored' },
          { id: 'ALERTS', label: 'Depletion Alerts' },
          { id: 'SETTLED', label: 'Settled Relief' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              activeFilter === tab.id
                ? 'bg-aquatic-cyan text-hydro-950 font-bold shadow-hydro-glow'
                : 'bg-hydro-800 text-slate-300 hover:text-white hover:bg-hydro-750'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};
