import React, { useState, useEffect, useCallback } from 'react';
import {
  Navbar,
} from './components/Navbar';
import {
  StatsOverview,
} from './components/StatsOverview';
import {
  PolicyCard,
} from './components/PolicyCard';
import {
  CreatePolicyModal,
} from './components/CreatePolicyModal';
import {
  TriggerClaimModal,
} from './components/TriggerClaimModal';
import {
  HydroInspectorModal,
} from './components/HydroInspectorModal';
import {
  AppealModal,
} from './components/AppealModal';
import {
  PullPayoutButton,
} from './components/PullPayoutButton';
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
          setWalletAddress(accounts[0]);
          const bal = await fetchStudionetBalance(accounts[0]);
          setBalance(bal);
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
          const sorted = [...parsed].sort((a, b) => Number(b.policy_id) - Number(a.policy_id));
          setPolicies(sorted);
        }
      }

      // 3. Update Balance if connected
      if (walletAddress) {
        const bal = await fetchStudionetBalance(walletAddress);
        setBalance(bal);
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
            setWalletAddress(accs[0]);
            fetchStudionetBalance(accs[0]).then(setBalance);
          }
        })
        .catch(() => {});

      // Listen for account change
      (window as any).ethereum.on?.('accountsChanged', (accs: string[]) => {
        if (accs && accs.length > 0) {
          setWalletAddress(accs[0]);
          fetchStudionetBalance(accs[0]).then(setBalance);
        } else {
          setWalletAddress('');
          setBalance('0.000');
        }
      });
    }

    const interval = setInterval(syncOnChainData, 15000);
    return () => clearInterval(interval);
  }, [syncOnChainData]);

  // Filter policies
  const filteredPolicies = policies.filter((p) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'ACTIVE') return p.status === STATUS_POLICY_ACTIVE;
    if (activeFilter === 'ALERTS')
      return p.status === STATUS_DEPLETION_ALERT || p.status === STATUS_AWAITING_PAYOUT || p.status === STATUS_DISPUTED;
    if (activeFilter === 'SETTLED')
      return (
        p.status === STATUS_SETTLED_RELIEF_PAID ||
        p.status === STATUS_SETTLED_PARTIAL ||
        p.status === STATUS_SETTLED_COMPLIANT ||
        p.status === STATUS_EXPIRED_RECLAIMED
      );
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-hydro-900 text-slate-100">
      <Navbar
        walletAddress={walletAddress}
        balance={balance}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        onRefresh={syncOnChainData}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats & Mission Overview */}
        <StatsOverview
          stats={stats}
          onOpenCreateModal={() => setIsCreateOpen(true)}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Pull Payment Safety Buffer */}
        {walletAddress && (
          <PullPayoutButton
            walletAddress={walletAddress}
            onSuccess={syncOnChainData}
          />
        )}

        {/* Policies Listing */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white flex items-center">
              <Layers className="w-5 h-5 mr-2 text-aquatic-cyan" />
              Monitored Aquifer Basins ({filteredPolicies.length})
            </h2>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-hydro-800 hover:bg-hydro-750 text-aquatic-cyan border border-hydro-700 text-xs font-mono transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Escrow</span>
            </button>
          </div>

          {filteredPolicies.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-hydro-850/60 border border-hydro-800 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-aquatic-cyan/10 border border-aquatic-cyan/30 flex items-center justify-center text-aquatic-cyan">
                <Droplets className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-heading font-semibold text-white text-base">No Aquifer Policies Found</h3>
                <p className="text-xs text-slate-400">
                  {activeFilter === 'ALL'
                    ? 'No water-rights indemnity escrows are registered on this contract yet.'
                    : `No policies matching filter "${activeFilter}".`}
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-aquatic-cyan to-aquatic-blue text-hydro-950 font-heading font-bold text-xs uppercase tracking-wide shadow-hydro-glow transition"
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
      </main>

      {/* Footer */}
      <footer className="bg-hydro-950 border-t border-hydro-800 py-8 px-4 sm:px-6 lg:px-8 mt-12 text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-compliant-emerald animate-pulse" />
            <span>Target Network: GenLayer StudioNet (Chain ID: {STUDIONET_CHAIN_ID})</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <a
              href={STUDIO_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-aquatic-cyan transition flex items-center"
            >
              <span>GenLayer Studio</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
            <a
              href="https://waterdata.usgs.gov/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-aquatic-cyan transition flex items-center"
            >
              <span>USGS NWIS</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
            <a
              href="https://land.copernicus.eu/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-aquatic-cyan transition flex items-center"
            >
              <span>Copernicus Land</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>

          <div className="text-slate-500 text-[10px]">
            Contract: {getSavedContractAddress()}
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
  );
}
