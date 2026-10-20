import React, { useState } from 'react';
import { X, AlertTriangle, ExternalLink, Loader2, ShieldCheck, Check, Radio } from 'lucide-react';
import { writeContractWithMetaMask, waitForTransactionReceipt, WaterPolicyData } from '../config/genlayer';

interface TriggerClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  policy: WaterPolicyData | null;
}

const ACCREDITED_SAMPLES = [
  {
    name: 'USGS Groundwater NWIS (Severe Drawdown Scenario)',
    url: 'https://waterdata.usgs.gov/nwis/uv?site_no=361201119500201&format=rdb',
    note: 'USGS well station reporting 185cm piezometric head drawdown and 420 PPM TDS.',
  },
  {
    name: 'Copernicus Global Land Service (Moderate Drawdown)',
    url: 'https://land.copernicus.eu/telemetry/aquifer-central-valley.json',
    note: 'Copernicus Sentinel piezometer reporting 130cm drawdown within warning zone.',
  },
  {
    name: 'NOAA National Water Model (Sustainable Baseline)',
    url: 'https://water.noaa.gov/sensors/colorado-basin-well4.json',
    note: 'NOAA real-time telemetry showing compliant 45cm drawdown and 210 PPM TDS.',
  },
];

export const TriggerClaimModal: React.FC<TriggerClaimModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  policy,
}) => {
  const [feedUrl, setFeedUrl] = useState(ACCREDITED_SAMPLES[0].url);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !policy) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!feedUrl || !feedUrl.startsWith('http')) {
      setError('Please provide a valid accredited telemetry URL (http/https).');
      return;
    }

    setLoading(true);
    try {
      const hash = await writeContractWithMetaMask(
        'trigger_depletion_claim',
        [policy.policy_id, feedUrl.trim()]
      );
      setTxHash(hash);
      await waitForTransactionReceipt(hash);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Trigger claim error:', err);
      setError(err?.message || 'Failed to submit depletion alert on-chain.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl my-8 p-6 sm:p-8 rounded-2xl bg-obsidian-900 border border-alert-crimson/40 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-obsidian-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="p-3 rounded-xl bg-alert-crimson/15 text-alert-crimson border border-alert-crimson/30 shadow-[0_0_15px_rgba(255,77,109,0.2)]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-lg sm:text-xl font-bold text-white tracking-wide">
              File Depletion & Salinity Claim
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Aquifer Basin ID: <span className="text-neon-mint font-semibold">{policy.aquifer_basin_id}</span> • Policy #{policy.policy_id}
            </p>
          </div>
        </div>

        {/* Accredited Feeds notice */}
        <div className="mb-5 p-4 rounded-xl bg-obsidian-850 border border-obsidian-750">
          <div className="text-xs font-mono text-neon-mint flex items-center mb-1.5 font-semibold">
            <ShieldCheck className="w-4 h-4 mr-1.5 text-neon-mint" />
            Accredited Hydrological Telemetry Providers
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
            GenVM consensus validates that hydrological telemetry originates strictly from authorized scientific agencies:
            <span className="text-neon-cyan font-mono block mt-1">USGS, Copernicus Land, NOAA, GRDC, BAFG, UK Env Agency</span>
          </p>

          <div className="space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Quick Select Accredited Feeds:
            </span>
            {ACCREDITED_SAMPLES.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setFeedUrl(s.url)}
                className={`w-full text-left p-2.5 rounded-lg border transition ${
                  feedUrl === s.url
                    ? 'bg-neon-mint/10 border-neon-mint text-white'
                    : 'bg-obsidian-950/70 hover:bg-obsidian-800 border-obsidian-750 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className={feedUrl === s.url ? 'text-neon-mint' : 'text-slate-200'}>{s.name}</span>
                  {feedUrl === s.url && <span className="text-[10px] font-mono bg-neon-mint/20 text-neon-mint px-1.5 py-0.5 rounded">Selected</span>}
                </div>
                <div className="text-[10px] text-slate-400 truncate font-mono mt-0.5">{s.url}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 font-semibold">
              Telemetry Data Endpoint (URL)
            </label>
            <input
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-obsidian-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-neon-mint transition"
              placeholder="https://waterdata.usgs.gov/..."
              required
            />
          </div>

          <div className="p-3.5 rounded-xl bg-obsidian-850/80 border border-obsidian-750 text-xs space-y-1.5 font-mono text-slate-300">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Max Permitted Drawdown SLA:</span>
              <span className="text-neon-mint font-semibold">&le; {policy.max_tolerable_drawdown_m} cm</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Max Tolerable Salinity Limit:</span>
              <span className="text-neon-cyan font-semibold">&le; {policy.max_salinity_tds_ppm} PPM TDS</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-alert-crimson/15 border border-alert-crimson/40 text-alert-crimson text-xs">
              {error}
            </div>
          )}

          {txHash && (
            <div className="p-3 rounded-xl bg-warning-amber/15 border border-warning-amber/40 text-warning-amber text-xs font-mono truncate">
              Broadcasting Tx: {txHash}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition hover:bg-obsidian-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-alert-crimson to-pink-600 hover:from-pink-500 hover:to-pink-600 text-white font-heading font-bold text-xs tracking-wider uppercase transition shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transmitting Alert...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Submit Depletion Alert</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
