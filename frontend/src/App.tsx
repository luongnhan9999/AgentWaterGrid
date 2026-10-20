import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { PolicyCard } from './components/PolicyCard';
import { CreatePolicyModal } from './components/CreatePolicyModal';
import { TriggerClaimModal } from './components/TriggerClaimModal';
import { HydroInspectorModal } from './components/HydroInspectorModal';
import { AppealModal } from './components/AppealModal';
import { PullPayoutButton } from './components/PullPayoutButton';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  readContract,
  fetchStudionetBalance,
  STUDIONET_CHAIN_ID,
  STUDIONET_RPC_URL,
  STUDIO_URL,
  WaterPolicyData,
  GridStats,
  STATUS_POLICY_ACTIVE,
  STATUS_DEPLETION_ALERT,
  STATUS_AWAITING_PAYOUT,
  STATUS_SETTLED_RELIEF_PAID,
  STATUS_SETTLED_PARTIAL,
  STATUS_SETTLED_COMPLIANT,
  STATUS_DISPUTED,
  STATUS_EXPIRED_RECLAIMED,
  STATUS_UNRESOLVED,
  getSavedContractAddress,
} from './config/genlayer';
import {
  Droplets,
  Layers,
  ShieldCheck,
  Cpu,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  Radio,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Globe,
} from 'lucide-react';

export function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0.000');
  const [stats, setStats] = useState<GridStats | null>(null);
  const [policies, setPolicies] = useState<WaterPolicyData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClaimPolicy, setSelectedClaimPolicy] = useState<WaterPolicyData | null>(null);
  const [selectedInspectorPolicy, setSelectedInspectorPolicy] = useState<WaterPolicyData | null>(null);
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
        if (Array.isArray(parsed)) {
          // Sort reverse by policy_id
          const sorted = [...parsed].sort((a, b) => Number(b.policy_id || 0) - Number(a.policy_id || 0));
          setPolicies(sorted);
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
    // Initial fetch
    syncOnChainData();

    // Check existing wallet
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

      // Listen for account change
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

  // Filter policies safely
  const filteredPolicies = policies.filter((p) => {
    const status = Number(p.status);
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'ACTIVE') return status === STATUS_POLICY_ACTIVE;
    if (activeFilter === 'ALERTS')
      return status === STATUS_DEPLETION_ALERT || status === STATUS_AWAITING_PAYOUT || status === STATUS_DISPUTED;
    if (activeFilter === 'SETTLED')
      return (
        status === STATUS_SETTLED_RELIEF_PAID ||
        status === STATUS_SETTLED_PARTIAL ||
        status === STATUS_SETTLED_COMPLIANT ||
        status === STATUS_EXPIRED_RECLAIMED
      );
    return true;
  });

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-obsidian-950 text-slate-100 font-sans selection:bg-neon-mint selection:text-obsidian-950">
        <Navbar
          walletAddress={walletAddress}
          balance={balance}
          onConnectWallet={handleConnectWallet}
          onDisconnectWallet={handleDisconnectWallet}
          onRefresh={syncOnChainData}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Hero & Metrics Cockpit */}
          <StatsOverview
            stats={stats}
            onOpenCreateModal={() => setIsCreateOpen(true)}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />

          {/* Pull Payment Protected Buffer (When wallet is connected) */}
          {walletAddress && (
            <PullPayoutButton
              walletAddress={walletAddress}
              onSuccess={syncOnChainData}
            />
          )}

          {/* Main Grid: Hydrological Feeds Info & Monitored Aquifer Basins */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-obsidian-800 gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-neon-mint/10 border border-neon-mint/30 text-neon-mint">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold text-white tracking-wide">
                    Live Monitored Aquifer Basins
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Direct on-chain storage ({filteredPolicies.length} policy{filteredPolicies.length === 1 ? '' : 'ies'} loaded)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-neon-mint to-neon-cyan hover:from-emerald-400 hover:to-cyan-400 text-obsidian-950 font-heading font-bold text-xs uppercase tracking-wide transition shadow-neon-glow"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Lock Water Escrow</span>
                </button>
              </div>
            </div>

            {filteredPolicies.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-obsidian-900 border border-obsidian-800 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-neon-mint/10 border border-neon-mint/30 flex items-center justify-center text-neon-mint shadow-neon-glow">
                  <Droplets className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="font-heading font-bold text-white text-lg">No Aquifer Policies Found</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {activeFilter === 'ALL'
                      ? 'No water-rights indemnity escrows are registered on this contract yet. Connect your wallet to create the first on-chain policy.'
                      : `No policies matching filter "${activeFilter}". Switch filter to view all basins.`}
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-neon-mint to-neon-cyan hover:from-emerald-400 hover:to-cyan-400 text-obsidian-950 font-heading font-bold text-xs uppercase tracking-wider shadow-neon-glow transition"
                >
                  Create First Water License Escrow
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredPolicies.map((p) => (
                  <PolicyCard
                    key={p.policy_id}
                    policy={p}
                    onOpenTriggerClaim={(pol) => setSelectedClaimPolicy(pol)}
                    onOpenInspector={(pol) => setSelectedInspectorPolicy(pol)}
                    onOpenAppeal={(pol) => setSelectedAppealPolicy(pol)}
                    userAddress={walletAddress}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Environmental Oracle Protocol Verification Card */}
          <div className="p-5 rounded-2xl bg-obsidian-900/90 border border-obsidian-800 text-xs text-slate-300 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-obsidian-800 pb-3">
              <span className="font-heading font-bold text-white flex items-center text-sm">
                <ShieldCheck className="w-4 h-4 mr-2 text-neon-mint" />
                On-Chain Environmental Oracle Verification Architecture
              </span>
              <span className="text-[11px] font-mono text-neon-cyan bg-obsidian-950 px-2.5 py-1 rounded-lg border border-obsidian-750">
                100% On-Chain • 0% Mock / Simulation
              </span>
            </div>

            <p className="leading-relaxed text-slate-400 text-xs">
              AgentWaterGrid leverages GenLayer's non-deterministic execution engine (<code className="text-neon-mint font-mono">gl.nondet.web.render</code>) to autonomously fetch piezometric water table drawdown and TDS salinity readings directly from accredited environmental authorities. All insurance indemnities and relief funds are held in immutable smart contract storage on StudioNet.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono text-[11px]">
              <div className="p-3 rounded-xl bg-obsidian-950/80 border border-obsidian-800">
                <div className="text-neon-mint font-semibold flex items-center mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Accredited Data Feeds
                </div>
                <div className="text-slate-400 text-[10px]">
                  USGS NWIS, Copernicus Land Service, NOAA Water, GRDC, BAFG
                </div>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-950/80 border border-obsidian-800">
                <div className="text-neon-cyan font-semibold flex items-center mb-1">
                  <Cpu className="w-3.5 h-3.5 mr-1" />
                  GenVM Consensus Tribunal
                </div>
                <div className="text-slate-400 text-[10px]">
                  Multi-validator non-deterministic web consensus with prompt-injection defense
                </div>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-950/80 border border-obsidian-800">
                <div className="text-warning-amber font-semibold flex items-center mb-1">
                  <Activity className="w-3.5 h-3.5 mr-1" />
                  Appellate Bond & Pull-Safety
                </div>
                <div className="text-slate-400 text-[10px]">
                  72s cooling window + 10% appeal bond + pull-payment pattern
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-obsidian-950 border-t border-obsidian-800 py-8 px-4 sm:px-6 lg:px-8 mt-12 text-xs font-mono text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-neon-mint animate-pulse" />
              <span>Network: GenLayer StudioNet (Chain ID: {STUDIONET_CHAIN_ID})</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <a
                href={STUDIO_URL}
                target="_blank"
                rel="noreferrer"
                className="hover:text-neon-mint transition flex items-center"
              >
                <span>GenLayer Studio</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
              <a
                href="https://waterdata.usgs.gov/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-neon-mint transition flex items-center"
              >
                <span>USGS NWIS</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
              <a
                href="https://land.copernicus.eu/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-neon-mint transition flex items-center"
              >
                <span>Copernicus Land</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>

            <div className="text-slate-500 text-[10px]">
              Contract: <span className="text-slate-400">{getSavedContractAddress()}</span>
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

        <HydroInspectorModal
          isOpen={selectedInspectorPolicy !== null}
          onClose={() => setSelectedInspectorPolicy(null)}
          policy={selectedInspectorPolicy}
          onOpenAppeal={(pol) => {
            setSelectedInspectorPolicy(null);
            setSelectedAppealPolicy(pol);
          }}
          onSuccess={syncOnChainData}
          userAddress={walletAddress}
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
