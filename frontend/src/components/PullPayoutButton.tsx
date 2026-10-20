import React, { useState, useEffect } from 'react';
import { Coins, Loader2, CheckCircle2, AlertCircle, ArrowDownToLine } from 'lucide-react';
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

  let hasBalance = false;
  try {
    hasBalance = BigInt(claimableWei || 0) > 0n;
  } catch {
    hasBalance = false;
  }
  const formattedGen = formatGen(claimableWei);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 rounded-2xl bg-obsidian-850 border border-obsidian-750 gap-4 transition hover:border-obsidian-700">
      <div className="flex items-center space-x-3.5">
        <div className={`p-3 rounded-xl transition ${hasBalance ? 'bg-neon-mint/15 text-neon-mint border border-neon-mint/30 shadow-neon-glow' : 'bg-obsidian-950 text-slate-400 border border-obsidian-750'}`}>
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center space-x-2">
            <span>Pull-Payment Protected Buffer</span>
            <span className="text-[10px] bg-obsidian-950 px-2 py-0.5 rounded text-neon-cyan border border-obsidian-750">
              Zero Reentrancy
            </span>
          </div>
          <div className="text-sm font-sans text-slate-200 mt-0.5">
            Claimable Balance:{' '}
            <strong className={`font-mono ${hasBalance ? 'text-neon-mint font-bold text-base' : 'text-slate-400'}`}>
              {formattedGen} GEN
            </strong>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 w-full sm:w-auto">
        {statusMsg && (
          <span className="text-xs font-mono text-neon-mint flex items-center truncate">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {statusMsg}
          </span>
        )}
        {errorMsg && (
          <span className="text-xs font-mono text-alert-crimson flex items-center truncate">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            {errorMsg}
          </span>
        )}

        <button
          onClick={handleClaim}
          disabled={!hasBalance || loading}
          className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-mint to-neon-cyan hover:from-emerald-400 hover:to-cyan-400 text-obsidian-950 font-heading font-bold text-xs uppercase tracking-wider transition shadow-neon-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Withdrawing...</span>
            </>
          ) : (
            <>
              <ArrowDownToLine className="w-4 h-4" />
              <span>Withdraw to Wallet</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
