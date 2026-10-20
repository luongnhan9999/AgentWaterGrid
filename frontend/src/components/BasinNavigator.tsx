import React, { useState } from 'react';
import {
  Layers,
  Search,
  PlusCircle,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronRight,
  Droplets,
  Activity,
  Globe2,
} from 'lucide-react';
import {
  WaterPolicyData,
  STATUS_POLICY_ACTIVE,
  STATUS_DEPLETION_ALERT,
  STATUS_AWAITING_PAYOUT,
  STATUS_SETTLED_RELIEF_PAID,
  STATUS_SETTLED_PARTIAL,
  STATUS_SETTLED_COMPLIANT,
  STATUS_DISPUTED,
  STATUS_EXPIRED_RECLAIMED,
} from '../config/genlayer';
import { formatGen, getStatusMetadata } from '../utils/formatters';

interface BasinNavigatorProps {
  policies: WaterPolicyData[];
  selectedPolicyId: string;
  onSelectPolicy: (policy: WaterPolicyData) => void;
  onOpenCreateModal: () => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const ACCREDITED_ORACLES = [
  { name: 'USGS NWIS Ground Network', status: 'ONLINE', ping: '24ms', type: 'Piezometric' },
  { name: 'Copernicus Global Land', status: 'ONLINE', ping: '48ms', type: 'Satellite Radar' },
  { name: 'NOAA National Water Model', status: 'ONLINE', ping: '31ms', type: 'Surface/Sub' },
  { name: 'GRDC Global Runoff Data', status: 'ACTIVE', ping: '55ms', type: 'Hydro Station' },
];

export const BasinNavigator: React.FC<BasinNavigatorProps> = ({
  policies,
  selectedPolicyId,
  onSelectPolicy,
  onOpenCreateModal,
  activeFilter,
  onFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = policies.filter((p) => {
    // Filter by tab
    const status = Number(p.status);
    let matchesTab = true;
    if (activeFilter === 'ACTIVE') matchesTab = status === STATUS_POLICY_ACTIVE;
    else if (activeFilter === 'ALERTS')
      matchesTab = status === STATUS_DEPLETION_ALERT || status === STATUS_AWAITING_PAYOUT || status === STATUS_DISPUTED;
    else if (activeFilter === 'SETTLED')
      matchesTab =
        status === STATUS_SETTLED_RELIEF_PAID ||
        status === STATUS_SETTLED_PARTIAL ||
        status === STATUS_SETTLED_COMPLIANT ||
        status === STATUS_EXPIRED_RECLAIMED;

    // Filter by search
    const cleanSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !cleanSearch ||
      String(p.aquifer_basin_id || '').toLowerCase().includes(cleanSearch) ||
      String(p.policy_id || '').toLowerCase().includes(cleanSearch) ||
      String(p.enterprise || '').toLowerCase().includes(cleanSearch);

    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Action & Search */}
      <div className="p-4 rounded-2xl bg-obsidian-900 border border-obsidian-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-neon-mint animate-pulse" />
            <h2 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
              Monitored Basins
            </h2>
          </div>
          <span className="text-[11px] font-mono text-neon-mint bg-neon-mint/10 px-2 py-0.5 rounded-md border border-neon-mint/30">
            {policies.length} ON-CHAIN
          </span>
        </div>

        {/* Lock New Escrow Button */}
        <button
          onClick={onOpenCreateModal}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-neon-mint to-neon-cyan hover:from-emerald-400 hover:to-cyan-400 text-obsidian-950 font-heading font-bold text-xs uppercase tracking-wide transition shadow-neon-glow"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Lock Water License Escrow</span>
        </button>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search basin ID, wellhead code..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-obsidian-950 border border-obsidian-750 text-slate-100 font-mono text-xs focus:outline-none focus:border-neon-mint transition placeholder:text-slate-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-obsidian-950 border border-obsidian-800 text-[10px] font-mono">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'ALERTS', label: 'Alerts' },
            { id: 'SETTLED', label: 'Settled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={`py-1 rounded-lg text-center font-semibold transition ${
                activeFilter === tab.id
                  ? 'bg-neon-mint text-obsidian-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Basin Policy Navigation List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[480px] pr-1">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-obsidian-900/60 border border-obsidian-800 space-y-2">
            <Droplets className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-xs text-slate-400 font-mono">No matching basin records.</p>
          </div>
        ) : (
          filtered.map((p) => {
            const isSelected = p.policy_id === selectedPolicyId;
            const meta = getStatusMetadata(p.status);
            return (
              <button
                key={p.policy_id}
                onClick={() => onSelectPolicy(p)}
                className={`w-full text-left p-3.5 rounded-2xl border transition relative overflow-hidden group ${
                  isSelected
                    ? 'bg-obsidian-850 border-neon-mint shadow-neon-glow'
                    : 'bg-obsidian-900 hover:bg-obsidian-850/80 border-obsidian-800 hover:border-obsidian-700'
                }`}
              >
                {/* Active Indicator Bar on Left */}
                {isSelected && (
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-neon-mint" />
                )}

                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-xs text-white truncate max-w-[170px] group-hover:text-neon-mint transition">
                    {p.aquifer_basin_id}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                    {meta.label}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-obsidian-800/80 font-mono text-[11px]">
                  <span className="text-slate-400">
                    Policy #{p.policy_id}
                  </span>
                  <span className="text-neon-mint font-bold">
                    {formatGen(p.escrow_amount)} GEN
                  </span>
                </div>

                <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-slate-400">
                  <span>Drawdown: {p.measured_drawdown_cm}cm</span>
                  <span>Salinity: {p.measured_salinity_ppm} PPM</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Live Accredited Environmental Oracle Feeds */}
      <div className="p-4 rounded-2xl bg-obsidian-900 border border-obsidian-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-semibold flex items-center">
            <Globe2 className="w-3.5 h-3.5 mr-1.5 text-neon-cyan" />
            Accredited Oracles
          </span>
          <span className="text-[10px] text-neon-mint flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-mint animate-ping mr-1" />
            SYNCED
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-[10px]">
          {ACCREDITED_ORACLES.map((o, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-obsidian-950 border border-obsidian-800/80"
            >
              <div>
                <span className="text-slate-200 font-semibold block">{o.name}</span>
                <span className="text-[9px] text-slate-400">{o.type}</span>
              </div>
              <div className="text-right">
                <span className="text-neon-mint font-bold">{o.status}</span>
                <span className="block text-[8px] text-slate-400">{o.ping}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
