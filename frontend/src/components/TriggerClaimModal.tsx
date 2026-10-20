import React, { useState } from 'react';
import { X, AlertTriangle, ExternalLink, Loader2, ShieldCheck, Check } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl my-8 p-6 md:p-8 rounded-2xl bg-hydro-850 border border-penalty-amber/40 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 rounded-xl bg-penalty-amber/15 text-penalty-amber border border-penalty-amber/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-white">File Depletion / Salinity Alert</h2>
            <p className="text-xs text-slate-400 font-sans">
              Policy #{policy.policy_id} • Basin {policy.aquifer_basin_id}
            </p>
          </div>
        </div>

        {/* Accredited Feeds notice */}
        <div className="mb-4 p-3 rounded-xl bg-hydro-800 border border-hydro-700">
          <span className="text-[11px] font-mono text-aquatic-cyan flex items-center mb-2">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-compliant-emerald" />
            Accredited Hydrological Data Authorities
          </span>
          <p className="text-[11px] text-slate-300 mb-2">
            Contract rules strictly reject unaccredited domains. Telemetry must originate from:
            <code className="text-aquatic-cyan ml-1">USGS, Copernicus, NOAA, GRDC, BAFG, or UK Env Agency</code>.
          </p>

          <div className="space-y-1.5 mt-2">
            {ACCREDITED_SAMPLES.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setFeedUrl(s.url)}
                className="w-full text-left p-2 rounded-lg bg-hydro-900 hover:bg-hydro-750 border border-hydro-700 text-[11px] text-slate-300 hover:text-white transition"
              >
                <div className="font-semibold text-aquatic-cyan">{s.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{s.url}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Live Sensor / Telemetry Endpoint URL
            </label>
            <input
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-hydro-900 border border-hydro-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-aquatic-cyan"
              placeholder="https://waterdata.usgs.gov/..."
              required
            />
          </div>

          <div className="p-3 rounded-lg bg-hydro-900/80 border border-hydro-750 text-xs space-y-1 font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Tolerable Drawdown SLA:</span>
              <span className="text-white">&le; {policy.max_tolerable_drawdown_m} cm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Salinity Upper Limit:</span>
              <span className="text-white">&le; {policy.max_salinity_tds_ppm} PPM TDS</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-depletion-red/10 border border-depletion-red/40 text-depletion-red text-xs">
              {error}
            </div>
          )}

          {txHash && (
            <div className="p-3 rounded-lg bg-penalty-amber/10 border border-penalty-amber/40 text-penalty-amber text-xs font-mono truncate">
              Consensus Tx: {txHash}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-penalty-amber to-amber-600 hover:from-amber-400 hover:to-amber-500 text-hydro-950 font-heading font-bold text-xs tracking-wider uppercase transition shadow-penalty-glow disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Alert...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>File Depletion Claim</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
