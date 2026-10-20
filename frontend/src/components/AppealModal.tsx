import React, { useState } from 'react';
import { X, Scale, AlertCircle, Loader2, Check, ShieldCheck } from 'lucide-react';
import { WaterPolicyData, writeContractWithMetaMask, waitForTransactionReceipt } from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface AppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  policy: WaterPolicyData | null;
}

const SUPPLEMENTAL_FEEDS = [
  {
    name: 'Regional Piezometer Network (UK Environment Agency / BAFG)',
    url: 'https://environment.data.gov.uk/hydrology/piezometer-8b.json',
    note: 'Deep baseline piezometer verifying regional aquifer recovery and dismissing local sensor spike.',
  },
  {
    name: 'GRDC Global Hydrological Sensor Network',
    url: 'https://grdc.bafg.de/telemetry/station-perth3.json',
    note: 'Multi-depth hydrological station data for saline boundary verification.',
  },
  {
    name: 'Copernicus Earth Observation Ground Station',
    url: 'https://land.copernicus.eu/telemetry/groundwater-piezometer-recheck.json',
    note: 'Secondary satellite microwave soil moisture & deep aquifer recharge confirmation.',
  },
];

export const AppealModal: React.FC<AppealModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  policy,
}) => {
  const [reason, setReason] = useState(
    'Primary wellhead sensor suffered transient mechanical pump cavitation; regional basin piezometer proves sustainable aquifer table.'
  );
  const [suppUrl, setSuppUrl] = useState(SUPPLEMENTAL_FEEDS[0].url);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !policy) return null;

  // Calculate 10% required bond
  const escrowWei = BigInt(policy.escrow_amount || 0);
  const requiredBondWei = (escrowWei * 10n) / 100n > 0n ? (escrowWei * 10n) / 100n : 1n;
  const requiredBondGen = formatGen(requiredBondWei);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (reason.trim().length < 10) {
      setError('Dispute justification must be at least 10 characters.');
      return;
    }

    if (!suppUrl || !suppUrl.startsWith('http')) {
      setError('Please provide a valid accredited supplemental telemetry URL.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: File appeal with 10% staked bond
      const appealTx = await writeContractWithMetaMask(
        'appeal_verdict',
        [policy.policy_id, reason.trim(), suppUrl.trim()],
        requiredBondWei
      );
      setTxHash(appealTx);
      await waitForTransactionReceipt(appealTx);

      // Step 2: Trigger Supreme Appellate Adjudication
      const adjTx = await writeContractWithMetaMask('adjudicate_appeal', [policy.policy_id]);
      setTxHash(adjTx);
      await waitForTransactionReceipt(adjTx);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Appeal error:', err);
      setError(err?.message || 'Failed to execute supreme appeal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl my-8 p-6 sm:p-8 rounded-2xl bg-obsidian-900 border border-warning-amber/40 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-obsidian-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="p-3 rounded-xl bg-warning-amber/15 text-warning-amber border border-warning-amber/30 shadow-[0_0_15px_rgba(255,184,0,0.2)]">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-lg sm:text-xl font-bold text-white">
              File Supreme Appellate Review
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Policy #{policy.policy_id} • Basin {policy.aquifer_basin_id}
            </p>
          </div>
        </div>

        {/* Bond requirement card */}
        <div className="mb-5 p-4 rounded-xl bg-obsidian-850 border border-warning-amber/30 text-xs font-mono space-y-2">
          <div className="flex justify-between items-center text-slate-300">
            <span>Escrow Coverage Value:</span>
            <span className="text-white font-bold">{formatGen(policy.escrow_amount)} GEN</span>
          </div>
          <div className="flex justify-between items-center text-warning-amber font-bold">
            <span className="flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Required 10% Appellate Staked Bond:
            </span>
            <span className="text-base">{requiredBondGen} GEN</span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
            Staking a 10% bond prevents frivolous claims. If the appellate AI jury overturns the breach, your 10% bond is fully refunded. If upheld, the bond is forfeited into the community relief fund.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 font-semibold">
              Appellate Justification & Technical Grounds
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-obsidian-700 text-slate-100 font-sans text-xs focus:outline-none focus:border-warning-amber transition resize-none"
              placeholder="State ground truth, sensor anomaly reasons, or corroborating piezometer evidence..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 font-semibold">
              Supplemental Accredited Telemetry URL
            </label>
            <input
              type="url"
              value={suppUrl}
              onChange={(e) => setSuppUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-obsidian-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-warning-amber transition"
              placeholder="https://..."
              required
            />

            <div className="mt-2 space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Recommended Supplemental Sensors:
              </span>
              {SUPPLEMENTAL_FEEDS.map((f, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSuppUrl(f.url)}
                  className={`w-full text-left p-2 rounded-lg border text-[11px] transition ${
                    suppUrl === f.url
                      ? 'bg-warning-amber/10 border-warning-amber text-warning-amber'
                      : 'bg-obsidian-950/70 hover:bg-obsidian-800 border-obsidian-750 text-slate-300'
                  }`}
                >
                  <div className="font-semibold">{f.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{f.url}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-alert-crimson/15 border border-alert-crimson/40 text-alert-crimson text-xs">
              {error}
            </div>
          )}

          {txHash && (
            <div className="p-3 rounded-xl bg-warning-amber/15 border border-warning-amber/40 text-warning-amber text-xs font-mono truncate">
              Appellate Tx: {txHash}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition hover:bg-obsidian-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-warning-amber to-amber-600 hover:from-amber-400 hover:to-amber-500 text-obsidian-950 font-heading font-bold text-xs tracking-wider uppercase transition shadow-[0_0_15px_rgba(255,184,0,0.3)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Staking & Adjudicating...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Stake {requiredBondGen} GEN & Appeal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
