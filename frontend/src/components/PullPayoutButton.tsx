import React, { useState, useEffect } from 'react';
import { Coins, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  readContract,
  writeContractWithMetaMask,
  waitForTransactionReceipt,
} from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface PullPayoutButtonProps {
  walletAddress: string;
  onSuccess: () => void;
}

export const PullPayoutButton: React.FC<PullPayoutButtonProps> = ({
  walletAddress,
  onSuccess,
}) => {
  const [claimableWei, setClaimableWei] = useState('0');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchClaimable = async () => {
    if (!walletAddress) {
      setClaimableWei('0');
      return;
    }
    try {
      const res = await readContract('get_claimable_balance', [walletAddress]);
      setClaimableWei(String(res || '0'));
    } catch (err) {
      console.warn('Failed to fetch claimable balance:', err);
    }
  };

  useEffect(() => {
    fetchClaimable();
    const interval = setInterval(fetchClaimable, 12000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  const handleClaim = async () => {
    if (!walletAddress) return;
    setLoading(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      const tx = await writeContractWithMetaMask('claim_payout', []);
      setStatusMsg(`Withdrawing balance... Tx: ${tx.slice(0, 10)}...`);
      await waitForTransactionReceipt(tx);
      setStatusMsg('Balance successfully claimed!');
      await fetchClaimable();
      onSuccess();
    } catch (err: any) {
      console.error('Claim payout error:', err);
      setErrorMsg(err?.message || 'Withdrawal failed.');
    } finally {
      setLoading(false);
    }
  };

  const hasBalance = BigInt(claimableWei) > 0n;
  const formattedGen = formatGen(claimableWei);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-hydro-800/90 border border-hydro-750 gap-4">
      <div className="flex items-center space-x-3">
        <div className={`p-2.5 rounded-lg ${hasBalance ? 'bg-compliant-emerald/20 text-compliant-emerald' : 'bg-hydro-750 text-slate-400'}`}>
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wide">
            Pull-Payment Escrow Safety Buffer
          </div>
          <div className="text-sm font-sans text-slate-200">
            Claimable Balance:{' '}
            <strong className={`font-mono ${hasBalance ? 'text-compliant-emerald font-bold' : 'text-slate-400'}`}>
              {formattedGen} GEN
            </strong>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 w-full sm:w-auto">
        {statusMsg && (
          <span className="text-xs font-mono text-compliant-emerald flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {statusMsg}
          </span>
        )}
        {errorMsg && (
          <span className="text-xs font-mono text-depletion-red flex items-center">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            {errorMsg}
          </span>
        )}

        <button
          onClick={handleClaim}
          disabled={!hasBalance || loading}
          className={`flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg font-heading font-bold text-xs uppercase tracking-wider transition ${
            hasBalance
              ? 'bg-compliant-emerald hover:bg-emerald-400 text-hydro-950 shadow-compliant-glow'
              : 'bg-hydro-750 text-slate-500 cursor-not-allowed border border-hydro-700'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Withdrawing...</span>
            </>
          ) : (
            <>
              <Coins className="w-4 h-4" />
              <span>Withdraw Payout</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
