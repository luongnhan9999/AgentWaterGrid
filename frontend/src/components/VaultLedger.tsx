import React, { useState, useEffect } from 'react';
import {
  Coins,
  ShieldCheck,
  ArrowDownToLine,
  Loader2,
  CheckCircle2,
  Lock,
  PieChart,
  Activity,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  Droplet,
} from 'lucide-react';
import {
  WaterPolicyData,
  GridStats,
  readContract,
  writeContractWithMetaMask,
  waitForTransactionReceipt,
  STUDIO_URL,
  getSavedContractAddress,
  STATUS_SETTLED_RELIEF_PAID,
  STATUS_SETTLED_PARTIAL,
  STATUS_SETTLED_COMPLIANT,
} from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface VaultLedgerProps {
  policy: WaterPolicyData | null;
  stats: GridStats | null;
  walletAddress: string;
  onRefresh: () => void;
}

export const VaultLedger: React.FC<VaultLedgerProps> = ({
  policy,
  stats,
  walletAddress,
  onRefresh,
}) => {
  const [claimableWei, setClaimableWei] = useState('0');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');

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
    const interval = setInterval(fetchClaimable, 10000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  const handleClaim = async () => {
    if (!walletAddress) return;
    setIsClaiming(true);
    setClaimSuccess('');
    setClaimError('');
    try {
      const tx = await writeContractWithMetaMask('claim_payout', []);
      await waitForTransactionReceipt(tx);
      setClaimSuccess('Claim successful!');
      await fetchClaimable();
      onRefresh();
    } catch (err: any) {
      console.error('Claim error:', err);
      setClaimError(err?.message || 'Failed to claim balance.');
    } finally {
      setIsClaiming(false);
    }
  };

  let hasBalance = false;
  try {
    hasBalance = BigInt(claimableWei || 0) > 0n;
  } catch {
    hasBalance = false;
  }
  const formattedClaimable = formatGen(claimableWei);

  // Escrow distribution calculation for selected policy
  const escrowAmount = policy ? formatGen(policy.escrow_amount) : '0.000';
  let communitySharePct = 0;
  let enterpriseSharePct = 100;
  if (policy) {
    if (policy.status === STATUS_SETTLED_RELIEF_PAID || policy.verdict === 'AQUIFER_DEPLETION_CONFIRMED') {
      communitySharePct = 100;
      enterpriseSharePct = 0;
    } else if (policy.status === STATUS_SETTLED_PARTIAL || policy.verdict === 'PARTIAL_DRAWDOWN_PENALTY') {
      communitySharePct = 40;
      enterpriseSharePct = 60;
    } else if (policy.status === STATUS_SETTLED_COMPLIANT || policy.verdict === 'AQUIFER_COMPLIANT_CLEAN') {
      communitySharePct = 0;
      enterpriseSharePct = 100;
    }
  }

  return (
    <div className="space-y-4">
      {/* Pull Payment Claim Buffer Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-obsidian-900 to-obsidian-950 border border-obsidian-750 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-neon-mint font-semibold flex items-center">
            <Coins className="w-4 h-4 mr-1.5 text-neon-mint" />
            Pull-Payment Safety Buffer
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Zero Reentrancy</span>
        </div>

        <div className="p-3.5 rounded-xl bg-obsidian-950/90 border border-obsidian-800 space-y-2">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Your Claimable Relief / Refunds
          </div>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-mono font-bold ${hasBalance ? 'text-neon-mint' : 'text-slate-400'}`}>
              {formattedClaimable} <span className="text-xs font-normal text-slate-400">GEN</span>
            </span>

            <button
              onClick={handleClaim}
              disabled={!hasBalance || isClaiming}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-neon-mint to-neon-cyan hover:from-emerald-400 hover:to-cyan-400 text-obsidian-950 font-heading font-bold text-xs uppercase tracking-wide transition shadow-neon-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Withdrawing...</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Withdraw</span>
                </>
              )}
            </button>
          </div>
        </div>

        {claimSuccess && (
          <div className="p-2.5 rounded-xl bg-neon-mint/15 border border-neon-mint/40 text-neon-mint text-[11px] font-mono flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
            <span>{claimSuccess}</span>
          </div>
        )}
        {claimError && (
          <div className="p-2.5 rounded-xl bg-alert-crimson/15 border border-alert-crimson/40 text-alert-crimson text-[11px] font-mono">
            {claimError}
          </div>
        )}
      </div>

      {/* Escrow Distribution Waterfall Simulation */}
      <div className="p-4 rounded-2xl bg-obsidian-900 border border-obsidian-750 shadow-xl space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-200 font-semibold flex items-center">
            <PieChart className="w-4 h-4 mr-1.5 text-neon-cyan" />
            Parametric Escrow Waterfall
          </span>
          <span className="text-[10px] text-slate-400">{escrowAmount} GEN Locked</span>
        </div>

        <div className="space-y-2 text-xs">
          {/* Progress Split Bar */}
          <div className="w-full h-3 rounded-full bg-obsidian-950 overflow-hidden flex border border-obsidian-800">
            <div
              className="h-full bg-alert-crimson transition-all duration-700"
              style={{ width: `${communitySharePct}%` }}
              title={`Community Relief: ${communitySharePct}%`}
            />
            <div
              className="h-full bg-neon-mint transition-all duration-700"
              style={{ width: `${enterpriseSharePct}%` }}
              title={`Enterprise Refund: ${enterpriseSharePct}%`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded-lg bg-obsidian-950 border border-obsidian-800">
              <span className="text-alert-crimson font-bold block">
                {communitySharePct}% Community Relief
              </span>
              <span className="text-slate-400 text-[10px]">
                Severe drawdown indemnification
              </span>
            </div>

            <div className="p-2 rounded-lg bg-obsidian-950 border border-obsidian-800">
              <span className="text-neon-mint font-bold block">
                {enterpriseSharePct}% Enterprise Refund
              </span>
              <span className="text-slate-400 text-[10px]">
                Sustainable extraction preserved
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Grid Protocol Metrics */}
      <div className="p-4 rounded-2xl bg-obsidian-900 border border-obsidian-750 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-200 font-semibold flex items-center">
            <Activity className="w-4 h-4 mr-1.5 text-neon-mint" />
            Network Operations
          </span>
          <span className="text-[10px] text-neon-mint font-mono bg-neon-mint/10 px-2 py-0.5 rounded border border-neon-mint/30">
            Chain 61999
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-3 rounded-xl bg-obsidian-950/80 border border-obsidian-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase">Total Value Escrowed</span>
            <div className="text-lg font-bold text-white">
              {stats ? formatGen(stats.total_water_locked) : '1.000'} <span className="text-xs text-neon-mint">GEN</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-950/80 border border-obsidian-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase">Settled Verdicts</span>
            <div className="text-lg font-bold text-white">
              {stats ? stats.total_policies_settled : 0} <span className="text-xs text-slate-400">Policies</span>
            </div>
          </div>
        </div>
      </div>

      {/* GenVM Security Invariants Card */}
      <div className="p-4 rounded-2xl bg-obsidian-900/90 border border-obsidian-800 space-y-2.5 font-mono text-[11px] text-slate-400">
        <div className="text-slate-300 font-semibold flex items-center text-xs">
          <ShieldCheck className="w-4 h-4 mr-1.5 text-neon-mint" />
          Autonomous Escrow Invariants
        </div>

        <ul className="space-y-1.5 pl-1 text-[10px]">
          <li className="flex items-center text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-mint mr-2 flex-shrink-0" />
            <span>24-Block (~72s) Dispute Cooling Window</span>
          </li>
          <li className="flex items-center text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan mr-2 flex-shrink-0" />
            <span>10% Appellate Staked Anti-Spam Bond</span>
          </li>
          <li className="flex items-center text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-warning-amber mr-2 flex-shrink-0" />
            <span>Non-Settling Protected State on Oracle Fail</span>
          </li>
          <li className="flex items-center text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 flex-shrink-0" />
            <span>Accredited USGS / Copernicus Whitelist Only</span>
          </li>
        </ul>

        <div className="pt-2 border-t border-obsidian-800 flex items-center justify-between text-[10px]">
          <span>Smart Contract:</span>
          <a
            href={`${STUDIO_URL}/contracts/${getSavedContractAddress()}`}
            target="_blank"
            rel="noreferrer"
            className="text-neon-cyan hover:underline flex items-center"
          >
            <span>View in Studio</span>
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
};
