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
  const escrowWei = BigInt(policy.escrow_amount);
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
      setError(err?.message || 'Appellate filing failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl my-8 p-6 md:p-8 rounded-2xl bg-hydro-850 border border-purple-500/50 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-white">Supreme Appellate Court Challenge</h2>
            <p className="text-xs text-slate-400 font-sans">
              24-Block Cooling Window • Policy #{policy.policy_id} ({policy.aquifer_basin_id})
            </p>
          </div>
        </div>

        {/* Bond Requirement Card */}
        <div className="mb-4 p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs font-mono space-y-1">
          <div className="flex justify-between text-purple-200">
            <span>Mandatory Dispute Bond (10%):</span>
            <span className="font-bold text-purple-300 text-sm">{requiredBondGen} GEN</span>
          </div>
          <p className="text-[11px] text-purple-300/80">
            If the appeal is upheld, the bond is refunded. If dismissed, the bond is forfeited to the counterparty.
          </p>
        </div>

        {/* Supplemental feeds */}
        <div className="mb-4 p-3 rounded-xl bg-hydro-800 border border-hydro-700">
          <span className="text-[11px] font-mono text-aquatic-cyan flex items-center mb-1">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-compliant-emerald" />
            Accredited Supplemental Data Feeds
          </span>
          <div className="space-y-1.5 mt-2">
            {SUPPLEMENTAL_FEEDS.map((f, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSuppUrl(f.url)}
                className="w-full text-left p-2 rounded-lg bg-hydro-900 hover:bg-hydro-750 border border-hydro-700 text-[11px] text-slate-300 hover:text-white transition"
              >
                <div className="font-semibold text-purple-300">{f.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{f.url}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Dispute Justification / Technical Explanation
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-hydro-900 border border-hydro-700 text-slate-100 font-sans text-xs focus:outline-none focus:border-purple-400"
              placeholder="State the hydrological rationale for contesting the verdict..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Supplemental Sensor Telemetry URL
            </label>
            <input
              type="url"
              value={suppUrl}
              onChange={(e) => setSuppUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-hydro-900 border border-hydro-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-purple-400"
              placeholder="https://environment.data.gov.uk/..."
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-depletion-red/10 border border-depletion-red/40 text-depletion-red text-xs">
              {error}
            </div>
          )}

          {txHash && (
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/40 text-purple-300 text-xs font-mono truncate">
              Appellate Tx: {txHash}
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
              className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-heading font-bold text-xs tracking-wider uppercase transition shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50"
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
