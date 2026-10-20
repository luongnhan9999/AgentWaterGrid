import React from 'react';
import { Droplets, ShieldAlert, CheckCircle2, AlertTriangle, Waves } from 'lucide-react';
import { WaterPolicyData } from '../config/genlayer';
import { formatDrawdown, formatSalinity } from '../utils/formatters';

interface AquiferCrossSectionProps {
  policy: WaterPolicyData;
}

export const AquiferCrossSection: React.FC<AquiferCrossSectionProps> = ({ policy }) => {
  const maxSla = Number(policy.max_tolerable_drawdown_m || 150);
  const measured = Number(policy.measured_drawdown_cm || 0);
  const salinity = Number(policy.measured_salinity_ppm || 0);
  const maxSalinity = Number(policy.max_salinity_tds_ppm || 500);

  // Compute depth percentage (0cm = surface level, max scale = maxSla * 1.5)
  const maxScale = Math.max(250, maxSla * 1.4);
  const measuredPct = Math.min(100, Math.max(10, (measured / maxScale) * 100));
  const slaPct = Math.min(95, Math.max(15, (maxSla / maxScale) * 100));

  const isDrawdownBreached = measured > maxSla;
  const isSalinityBreached = salinity > maxSalinity;
  const salinityInfo = formatSalinity(salinity);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-obsidian-900 via-obsidian-850 to-obsidian-950 border border-obsidian-750 p-5 shadow-2xl">
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(0, 245, 160, 0.15) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-obsidian-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-neon-mint/15 text-neon-mint border border-neon-mint/30">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <span className="font-heading font-bold text-xs text-white uppercase tracking-wider block">
              Piezometric Aquifer Stratigraphy & Depth Gauge
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Basin: <span className="text-neon-cyan font-bold">{policy.aquifer_basin_id}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono text-[11px]">
          {isDrawdownBreached || isSalinityBreached ? (
            <span className="px-2 py-0.5 rounded-md bg-alert-crimson/20 text-alert-crimson border border-alert-crimson/40 font-bold flex items-center">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              SLA BREACH DETECTED
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-neon-mint/20 text-neon-mint border border-neon-mint/40 font-bold flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              SUSTAINABLE HYDRO BALANCE
            </span>
          )}
        </div>
      </div>

      {/* Cross Section Visualizer */}
      <div className="relative z-10 mt-4 grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* Left: Interactive Stratigraphy Depth Column (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between">
          <div className="relative h-64 rounded-xl bg-obsidian-950 border border-obsidian-750 overflow-hidden flex">
            {/* Depth Markers Strip */}
            <div className="w-14 bg-obsidian-900 border-r border-obsidian-800 flex flex-col justify-between p-2 font-mono text-[10px] text-slate-400 select-none">
              <div>
                <span className="text-neon-mint font-bold">0m</span>
                <span className="block text-[8px] text-slate-400">SURFACE</span>
              </div>
              <div>
                <span>-0.5m</span>
              </div>
              <div className="text-warning-amber">
                <span className="font-bold">-{ (maxSla / 100).toFixed(1) }m</span>
                <span className="block text-[8px] text-warning-amber">SLA LIMIT</span>
              </div>
              <div>
                <span>-2.0m</span>
              </div>
              <div className="text-slate-400">
                <span>-2.5m</span>
                <span className="block text-[8px] text-slate-400">BEDROCK</span>
              </div>
            </div>

            {/* Stratigraphy Layers Display */}
            <div className="flex-1 relative flex flex-col justify-between">
              {/* Vadose Zone (Top Soil & Aerated Layer) */}
              <div
                className="w-full bg-gradient-to-b from-[#251f18] to-[#1a1714] border-b border-[#3b3229] relative transition-all duration-700"
                style={{ height: `${measuredPct}%` }}
              >
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#d4a373_1px,transparent_1px)] [background-size:8px_8px]" />
                <div className="absolute top-2 left-3 font-mono text-[10px] text-amber-200/80 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
                  Vadose Unsaturated Zone (Drawdown Drop: {formatDrawdown(measured)})
                </div>
              </div>

              {/* Threshold SLA Line (Dotted Warning Line) */}
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-warning-amber z-20 flex items-center justify-between px-3 pointer-events-none transition-all duration-500"
                style={{ top: `${slaPct}%` }}
              >
                <span className="text-[9px] font-mono font-bold bg-obsidian-950/90 text-warning-amber px-1.5 py-0.5 rounded border border-warning-amber/40">
                  MAX TOLERABLE DRAWDOWN: &le; {maxSla} cm
                </span>
                <span className="text-[9px] font-mono text-warning-amber">
                  Critical SLA Threshold
                </span>
              </div>

              {/* Water Table / Aquifer Saturated Layer (Bottom) */}
              <div
                className="w-full relative transition-all duration-700 flex-1 flex flex-col justify-end"
                style={{
                  background: isDrawdownBreached
                    ? 'linear-gradient(180deg, rgba(255, 77, 109, 0.4) 0%, rgba(12, 32, 28, 0.95) 100%)'
                    : 'linear-gradient(180deg, rgba(0, 245, 160, 0.35) 0%, rgba(0, 217, 245, 0.15) 50%, rgba(5, 14, 12, 0.95) 100%)',
                }}
              >
                {/* Water Surface Wave Effect */}
                <div className="w-full h-2 bg-gradient-to-r from-neon-mint via-neon-cyan to-neon-mint opacity-80 animate-pulse" />

                <div className="p-3 relative z-10 flex items-center justify-between font-mono text-[10px]">
                  <div className="flex items-center text-neon-mint font-bold">
                    <Droplets className="w-3.5 h-3.5 mr-1" />
                    Piezometric Head Level: {measured} cm
                  </div>
                  <div className="text-slate-300">
                    {isDrawdownBreached ? (
                      <span className="text-alert-crimson font-bold">
                        +{measured - maxSla} cm SLA Breach
                      </span>
                    ) : (
                      <span className="text-neon-mint font-semibold">
                        {maxSla - measured} cm Safety Buffer
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Technical Hydrology Readouts & Salinity Meter (5 cols) */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-3">
          {/* Drawdown SLA Stat Box */}
          <div className="p-3.5 rounded-xl bg-obsidian-950/80 border border-obsidian-750 font-mono text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Drawdown Status</span>
              <span className="text-slate-300">Tolerance: &le;{maxSla}cm</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-white">
                {measured} <span className="text-xs font-normal text-slate-400">cm</span>
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                  isDrawdownBreached
                    ? 'bg-alert-crimson/20 text-alert-crimson border border-alert-crimson/40'
                    : 'bg-neon-mint/20 text-neon-mint border border-neon-mint/40'
                }`}
              >
                {isDrawdownBreached ? 'DEPLETION BREACH' : 'WITHIN SLA'}
              </span>
            </div>
          </div>

          {/* TDS Salinity Meter Box */}
          <div className="p-3.5 rounded-xl bg-obsidian-950/80 border border-obsidian-750 font-mono text-xs space-y-2">
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>TDS Salinity Concentration</span>
              <span className="text-slate-300">Limit: &le;{maxSalinity} PPM</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-white">
                {salinity} <span className="text-xs font-normal text-slate-400">PPM</span>
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                  isSalinityBreached
                    ? 'bg-alert-crimson/20 text-alert-crimson border border-alert-crimson/40'
                    : salinity > 500
                    ? 'bg-warning-amber/20 text-warning-amber border border-warning-amber/40'
                    : 'bg-neon-mint/20 text-neon-mint border border-neon-mint/40'
                }`}
              >
                {salinityInfo.safety}
              </span>
            </div>

            {/* Salinity Progress Bar */}
            <div className="w-full h-2 rounded-full bg-obsidian-900 overflow-hidden relative border border-obsidian-800">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (salinity / 1200) * 100)}%`,
                  background: isSalinityBreached
                    ? '#FF4D6D'
                    : salinity > 500
                    ? '#FFB800'
                    : '#00F5A0',
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>0 (Fresh)</span>
              <span>500 (EPA Max)</span>
              <span>1000+ (Saline Intrusion)</span>
            </div>
          </div>

          {/* Accredited Feed Proof Pill */}
          <div className="p-2.5 rounded-xl bg-obsidian-900/90 border border-obsidian-800 font-mono text-[10px] space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span>Telemetry Authority:</span>
              <span className="text-neon-cyan font-semibold">
                {policy.hydrology_feed_url?.includes('usgs')
                  ? 'USGS NWIS Ground Station'
                  : policy.hydrology_feed_url?.includes('copernicus')
                  ? 'Copernicus Global Land Sentinel'
                  : 'Accredited Hydrological Sensor'}
              </span>
            </div>
            <div className="truncate text-slate-400">
              Snapshot Hash: {policy.evidence_hash || 'SHA-256 Awaiting Ingestion'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
