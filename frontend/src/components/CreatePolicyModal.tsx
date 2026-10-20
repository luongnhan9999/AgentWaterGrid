import React, { useState } from 'react';
import { X, Droplets, AlertCircle, Check, Loader2, Sparkles } from 'lucide-react';
import { writeContractWithMetaMask, waitForTransactionReceipt } from '../config/genlayer';
import { parseGenToWei } from '../utils/formatters';

interface CreatePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userAddress: string;
}

const PRESETS = [
  {
    name: 'Central Valley Basin B4 (Agricultural)',
    basinId: 'CENTRAL-VALLEY-AQUIFER-B4',
    drawdownCm: 150,
    salinityPpm: 500,
    blocks: 60000,
    amountGen: '1.0',
  },
  {
    name: 'Ogallala Aquifer Deep Basin (Industrial)',
    basinId: 'OGALLALA-DEEP-WELL-N2',
    drawdownCm: 120,
    salinityPpm: 450,
    blocks: 80000,
    amountGen: '2.5',
  },
  {
    name: 'Perth Desalination Buffer (Coastal Brackish)',
    basinId: 'PERTH-COASTAL-AQUIFER-03',
    drawdownCm: 100,
    salinityPpm: 600,
    blocks: 40000,
    amountGen: '1.5',
  },
];

export const CreatePolicyModal: React.FC<CreatePolicyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userAddress,
}) => {
  const [communityRep, setCommunityRep] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [basinId, setBasinId] = useState('CENTRAL-VALLEY-AQUIFER-B4');
  const [drawdownCm, setDrawdownCm] = useState(150);
  const [salinityPpm, setSalinityPpm] = useState(500);
  const [durationBlocks, setDurationBlocks] = useState(60000);
  const [depositGen, setDepositGen] = useState('1.0');

  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setBasinId(preset.basinId);
    setDrawdownCm(preset.drawdownCm);
    setSalinityPpm(preset.salinityPpm);
    setDurationBlocks(preset.blocks);
    setDepositGen(preset.amountGen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!communityRep || !communityRep.startsWith('0x') || communityRep.length !== 42) {
      setError('Please provide a valid 42-character EVM address for the community representative.');
      return;
    }

    if (userAddress && communityRep.toLowerCase() === userAddress.toLowerCase()) {
      setError('Enterprise cannot designate their own wallet as the community beneficiary.');
      return;
    }

    if (!basinId || basinId.trim().length < 4) {
      setError('Aquifer basin / wellhead ID must be at least 4 characters.');
      return;
    }

    const valueWei = parseGenToWei(depositGen);
    if (valueWei <= 0n) {
      setError('Water-rights escrow deposit must be greater than 0 GEN.');
      return;
    }

    setLoading(true);
    try {
      const hash = await writeContractWithMetaMask(
        'create_water_license_escrow',
        [
          communityRep.trim(),
          basinId.trim(),
          Number(drawdownCm),
          Number(salinityPpm),
          Number(durationBlocks),
        ],
        valueWei
      );
      setTxHash(hash);
      await waitForTransactionReceipt(hash);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create water escrow:', err);
      setError(err?.message || 'Transaction submission failed on GenLayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl my-8 p-6 md:p-8 rounded-2xl bg-hydro-850 border border-hydro-700 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 rounded-xl bg-aquatic-cyan/15 text-aquatic-cyan border border-aquatic-cyan/30">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-white">Create Water License Escrow</h2>
            <p className="text-xs text-slate-400 font-sans">
              Lock GEN indemnity funds guaranteeing sustainable aquifer extraction SLAs
            </p>
          </div>
        </div>

        {/* Presets */}
        <div className="mb-5 p-3 rounded-xl bg-hydro-800 border border-hydro-700">
          <span className="text-[11px] font-mono text-aquatic-cyan flex items-center mb-2">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Quick Aquifer Presets
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-left p-2 rounded-lg bg-hydro-900 hover:bg-hydro-750 border border-hydro-700 text-[11px] text-slate-300 hover:text-white transition"
              >
                <div className="font-semibold text-white truncate">{p.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {p.drawdownCm}cm drop • {p.amountGen} GEN
                </div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Community Representative Address (Beneficiary)
            </label>
            <input
              type="text"
              value={communityRep}
              onChange={(e) => setCommunityRep(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-hydro-900 border border-hydro-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-aquatic-cyan"
              placeholder="0x..."
              required
            />
            <span className="text-[10px] text-slate-500">
              Municipal water board, farmer co-op, or local conservation authority
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Aquifer Basin / Wellhead ID
              </label>
              <input
                type="text"
                value={basinId}
                onChange={(e) => setBasinId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-hydro-900 border border-hydro-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-aquatic-cyan"
                placeholder="e.g. CENTRAL-VALLEY-B4"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Escrow Deposit (GEN)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={depositGen}
                onChange={(e) => setDepositGen(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-hydro-900 border border-hydro-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-aquatic-cyan"
                placeholder="1.0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Max Drawdown (cm)
              </label>
              <input
                type="number"
                min="10"
                max="2000"
                value={drawdownCm}
                onChange={(e) => setDrawdownCm(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-hydro-900 border border-hydro-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-aquatic-cyan"
                required
              />
              <span className="text-[10px] text-slate-500">e.g. 150 = 1.5 meters</span>
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Max Salinity TDS (PPM)
              </label>
              <input
                type="number"
                min="50"
                max="5000"
                value={salinityPpm}
                onChange={(e) => setSalinityPpm(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-hydro-900 border border-hydro-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-aquatic-cyan"
                required
              />
              <span className="text-[10px] text-slate-500">500 ppm EPA Potable</span>
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Coverage Term (Blocks)
              </label>
              <input
                type="number"
                min="100"
                value={durationBlocks}
                onChange={(e) => setDurationBlocks(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-hydro-900 border border-hydro-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-aquatic-cyan"
                required
              />
              <span className="text-[10px] text-slate-500">~{Math.round((durationBlocks * 3) / 86400)} days</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-depletion-red/10 border border-depletion-red/40 text-depletion-red text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {txHash && (
            <div className="p-3 rounded-lg bg-aquatic-cyan/10 border border-aquatic-cyan/40 text-aquatic-cyan text-xs font-mono flex items-center space-x-2 truncate">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Consensus TX: {txHash}</span>
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
              className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-aquatic-cyan to-aquatic-blue hover:from-cyan-400 hover:to-blue-500 text-hydro-950 font-heading font-bold text-xs tracking-wider uppercase transition shadow-hydro-glow disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locking Escrow...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Deposit {depositGen} GEN Escrow</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
