import React, { useState } from 'react';
import {
  Droplets,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  Settings,
  RefreshCw,
  Waves,
} from 'lucide-react';
import {
  STUDIONET_CHAIN_ID,
  STUDIONET_CHAIN_ID_HEX,
  STUDIONET_RPC_URL,
  STUDIO_URL,
  getSavedContractAddress,
  saveContractAddress,
} from '../config/genlayer';
import { shortenAddress } from '../utils/formatters';

interface NavbarProps {
  walletAddress: string;
  balance: string;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  walletAddress,
  balance,
  onConnectWallet,
  onDisconnectWallet,
  onRefresh,
  isRefreshing,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempAddress, setTempAddress] = useState(getSavedContractAddress());

  const handleCopyContract = () => {
    navigator.clipboard.writeText(getSavedContractAddress());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveContract = () => {
    saveContractAddress(tempAddress);
    setIsSettingsOpen(false);
    window.location.reload();
  };

  const handleSwitchNetwork = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
        });
      } catch (err: any) {
        if (err.code === 4902) {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: STUDIONET_CHAIN_ID_HEX,
                chainName: 'GenLayer StudioNet',
                rpcUrls: [STUDIONET_RPC_URL],
                nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
                blockExplorerUrls: [STUDIO_URL],
              },
            ],
          });
        }
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-hydro-900/90 backdrop-blur-md border-b border-hydro-700/60 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Protocol Title */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-aquatic-cyan/20 to-aquatic-blue/20 border border-aquatic-cyan/40 shadow-hydro-glow">
              <Droplets className="w-6 h-6 text-aquatic-cyan animate-pulse" />
              <Waves className="w-3.5 h-3.5 text-compliant-emerald absolute -bottom-1 -right-1" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-heading font-bold text-xl text-white tracking-tight">
                  AgentWater<span className="text-aquatic-cyan">Grid</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-semibold bg-aquatic-cyan/10 text-aquatic-cyan border border-aquatic-cyan/30">
                  STUDIONET {STUDIONET_CHAIN_ID}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans hidden md:block">
                Autonomous Desalination & Groundwater Depletion Parametric Escrow
              </p>
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center space-x-3">
            {/* Refresh Live Data */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Sync On-Chain State"
              className="p-2.5 rounded-lg bg-hydro-800 border border-hydro-700 text-slate-300 hover:text-aquatic-cyan hover:border-aquatic-cyan/40 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-aquatic-cyan' : ''}`} />
            </button>

            {/* Contract Address Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-hydro-800/80 border border-hydro-700 text-xs font-mono">
              <span className="text-slate-400">Contract:</span>
              <span className="text-aquatic-cyan">{shortenAddress(getSavedContractAddress(), 4)}</span>
              <button
                onClick={handleCopyContract}
                className="text-slate-400 hover:text-white transition"
                title="Copy Contract Address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-compliant-emerald" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-slate-400 hover:text-white transition"
                title="Configure Contract Address"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Wallet Integration */}
            {walletAddress ? (
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex flex-col items-end px-3 py-1 rounded-lg bg-hydro-800 border border-hydro-700 text-right">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Balance</span>
                  <span className="text-xs font-mono font-semibold text-aquatic-cyan">{balance} GEN</span>
                </div>
                <button
                  onClick={onDisconnectWallet}
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-hydro-800 hover:bg-hydro-750 border border-hydro-600 text-xs font-mono text-slate-200 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-compliant-emerald animate-ping" />
                  <span>{shortenAddress(walletAddress, 3)}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onConnectWallet}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-aquatic-cyan to-aquatic-blue hover:from-cyan-400 hover:to-blue-500 text-hydro-950 font-semibold text-xs tracking-wide transition shadow-hydro-glow"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contract Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-hydro-850 border border-hydro-700 shadow-2xl">
            <h3 className="font-heading text-lg font-bold text-white mb-2">Configure StudioNet Contract</h3>
            <p className="text-xs text-slate-400 mb-4">
              Override the target Intelligent Contract address on GenLayer StudioNet (Chain ID: 61999).
            </p>
            <input
              type="text"
              value={tempAddress}
              onChange={(e) => setTempAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-hydro-900 border border-hydro-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-aquatic-cyan mb-4"
              placeholder="0x..."
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContract}
                className="px-4 py-2 rounded-lg bg-aquatic-cyan text-hydro-950 text-xs font-semibold hover:bg-cyan-400 transition"
              >
                Save & Reload
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
