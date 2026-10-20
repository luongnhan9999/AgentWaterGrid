import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { BasinNavigator } from './components/BasinNavigator';
import { CommandCenterStage } from './components/CommandCenterStage';
import { VaultLedger } from './components/VaultLedger';
import { CreatePolicyModal } from './components/CreatePolicyModal';
import { TriggerClaimModal } from './components/TriggerClaimModal';
import { HydroInspectorModal } from './components/HydroInspectorModal';
import { AppealModal } from './components/AppealModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  readContract,
  fetchStudionetBalance,
  STUDIONET_CHAIN_ID,
  STUDIO_URL,
  WaterPolicyData,
  GridStats,
  getSavedContractAddress,
} from './config/genlayer';
import {
  ExternalLink,
  ShieldCheck,
  Radio,
  Cpu,
  Layers,
  Activity,
} from 'lucide-react';

export function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0.000');
  const [stats, setStats] = useState<GridStats | null>(null);
  const [policies, setPolicies] = useState<WaterPolicyData[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClaimPolicy, setSelectedClaimPolicy] = useState<WaterPolicyData | null>(null);
  const [selectedAppealPolicy, setSelectedAppealPolicy] = useState<WaterPolicyData | null>(null);

  // Connect wallet
  const handleConnectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts && accounts.length > 0) {
          const acc = String(accounts[0]);
          setWalletAddress(acc);
          try {
            const bal = await fetchStudionetBalance(acc);
            setBalance(String(bal || '0.000'));
          } catch {
            setBalance('0.000');
          }
        }
      } catch (err) {
        console.error('Wallet connection rejected:', err);
      }
    } else {
      alert('Please install MetaMask or another Web3 extension to connect to GenLayer StudioNet.');
    }
  };

  const handleDisconnectWallet = () => {
    setWalletAddress('');
    setBalance('0.000');
  };

  // Sync data from contract
  const syncOnChainData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch Stats
      const statsRes = await readContract('get_stats', []);
      if (statsRes) {
        setStats(typeof statsRes === 'string' ? JSON.parse(statsRes) : statsRes);
      }

      // 2. Fetch Policies
      const policiesRes = await readContract('get_all_policies', []);
      if (policiesRes) {
        const parsed = typeof policiesRes === 'string' ? JSON.parse(policiesRes) : policiesRes;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sorted = [...parsed].sort((a, b) => Number(b.policy_id || 0) - Number(a.policy_id || 0));
          setPolicies(sorted);
          // Set active selection if not already selected or if currently selected doesn't exist
          setSelectedPolicyId((prev) => {
            if (prev && sorted.some((p) => p.policy_id === prev)) return prev;
            return sorted[0].policy_id;
          });
        }
      }

      // 3. Update Balance if connected
      if (walletAddress) {
        try {
          const bal = await fetchStudionetBalance(walletAddress);
          setBalance(String(bal || '0.000'));
        } catch {
          setBalance('0.000');
        }
      }
    } catch (err) {
      console.warn('Failed to sync on-chain data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    syncOnChainData();

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: 'eth_accounts' })
        .then((accs: string[]) => {
          if (accs && accs.length > 0) {
            const acc = String(accs[0]);
            setWalletAddress(acc);
            fetchStudionetBalance(acc).then((b) => setBalance(String(b || '0.000'))).catch(() => setBalance('0.000'));
          }
        })
        .catch(() => {});

      (window as any).ethereum.on?.('accountsChanged', (accs: string[]) => {
        if (accs && accs.length > 0) {
          const acc = String(accs[0]);
          setWalletAddress(acc);
          fetchStudionetBalance(acc).then((b) => setBalance(String(b || '0.000'))).catch(() => setBalance('0.000'));
        } else {
          setWalletAddress('');
          setBalance('0.000');
        }
      });
    }

    const interval = setInterval(syncOnChainData, 15000);
    return () => clearInterval(interval);
  }, [syncOnChainData]);

  // Selected policy object
  const activePolicy = policies.find((p) => p.policy_id === selectedPolicyId) || policies[0] || null;

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-obsidian-950 text-slate-100 font-sans selection:bg-neon-mint selection:text-obsidian-950">
        {/* Top HUD Navigation */}
        <Navbar
          walletAddress={walletAddress}
          balance={balance}
          onConnectWallet={handleConnectWallet}
          onDisconnectWallet={handleDisconnectWallet}
          onRefresh={syncOnChainData}
          isRefreshing={isRefreshing}
        />

        {/* Global Telemetry Matrix Ticker */}
        <div className="bg-obsidian-900/90 border-b border-obsidian-800/80 py-2 px-4 sm:px-6 lg:px-8 text-xs font-mono text-slate-300">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="flex items-center text-neon-mint font-bold text-[11px]">
                <Radio className="w-3.5 h-3.5 mr-1.5 animate-pulse text-neon-mint" />
                TACTICAL HYDRO-GRID LIVE
              </span>
              <span className="text-obsidian-750">|</span>
              <span className="text-slate-400 text-[11px]">
                Target: <strong className="text-white">GenLayer StudioNet (61999)</strong>
              </span>
              <span className="text-obsidian-750 hidden md:inline">|</span>
              <span className="text-slate-400 text-[11px] hidden md:inline">
                Canary Token: <strong className="text-neon-cyan">CANARY_AGENT_WATER_GRID_V1</strong>
              </span>
            </div>

            <div className="flex items-center space-x-3 text-[11px]">
              <span className="text-slate-400">Escrow Security:</span>
              <span className="px-2 py-0.5 rounded bg-neon-mint/10 text-neon-mint border border-neon-mint/30 font-bold">
                100% PURE ON-CHAIN
              </span>
              <span className="text-slate-400 hidden sm:inline">Zero Mock / 0% Simulation</span>
            </div>
          </div>
        </div>

        {/* Main Cockpit Body: Asymmetrical 3-Column Tactical Command Operations Matrix */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Column 1: Monitored Basins & Telemetry Feeds Navigator (3 cols on lg) */}
            <div className="lg:col-span-3">
              <BasinNavigator
                policies={policies}
                selectedPolicyId={selectedPolicyId}
                onSelectPolicy={(pol) => setSelectedPolicyId(pol.policy_id)}
                onOpenCreateModal={() => setIsCreateOpen(true)}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
            </div>

            {/* Column 2: Main Tactical Stage - Stratigraphy Cross-Section, Consensus & Actions (6 cols on lg) */}
            <div className="lg:col-span-6">
              <CommandCenterStage
                policy={activePolicy}
                onOpenTriggerClaim={(pol) => setSelectedClaimPolicy(pol)}
                onOpenAppeal={(pol) => setSelectedAppealPolicy(pol)}
                onSuccess={syncOnChainData}
                userAddress={walletAddress}
              />
            </div>

            {/* Column 3: Escrow Waterfall Ledger, Pull-Payment Vault & Invariants (3 cols on lg) */}
            <div className="lg:col-span-3">
              <VaultLedger
                policy={activePolicy}
                stats={stats}
                walletAddress={walletAddress}
                onRefresh={syncOnChainData}
              />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-obsidian-950 border-t border-obsidian-800 py-6 px-4 sm:px-6 lg:px-8 mt-12 text-xs font-mono text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-neon-mint animate-pulse" />
              <span>Target Network: GenLayer StudioNet (Chain ID: {STUDIONET_CHAIN_ID})</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <a
                href={STUDIO_URL}
                target="_blank"
                rel="noreferrer"
                className="hover:text-neon-mint transition flex items-center"
              >
                <span>GenLayer Studio Explorer</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
              <a
                href="https://waterdata.usgs.gov/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-neon-mint transition flex items-center"
              >
                <span>USGS NWIS Telemetry</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
              <a
                href="https://land.copernicus.eu/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-neon-mint transition flex items-center"
              >
                <span>Copernicus Global Land</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>

            <div className="text-slate-500 text-[10px]">
              Smart Contract: <span className="text-slate-400">{getSavedContractAddress()}</span>
            </div>
          </div>
        </footer>

        {/* Modals */}
        <CreatePolicyModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={syncOnChainData}
          userAddress={walletAddress}
        />

        <TriggerClaimModal
          isOpen={selectedClaimPolicy !== null}
          onClose={() => setSelectedClaimPolicy(null)}
          onSuccess={syncOnChainData}
          policy={selectedClaimPolicy}
        />

        <AppealModal
          isOpen={selectedAppealPolicy !== null}
          onClose={() => setSelectedAppealPolicy(null)}
          onSuccess={syncOnChainData}
          policy={selectedAppealPolicy}
        />
      </div>
    </ErrorBoundary>
  );
}
