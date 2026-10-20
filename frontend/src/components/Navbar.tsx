import React, { useState } from 'react';
import {
  Droplets,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  Settings,
  RefreshCw,
  Activity,
  Layers,
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
    <header className="sticky top-0 z-40 bg-cleantech-950/95 backdrop-blur-md border-b border-cleantech-700/80 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Protocol Title */}
          <div className="flex items-center space-x-3.5">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-mint-neon/20 via-cleantech-800 to-aqua-cyan/20 border border-mint-neon/40 shadow-mint-glow">
              <Droplets className="w-6 h-6 text-mint-neon" />
              <span className="w-2.5 h-2.5 rounded-full bg-aqua-cyan absolute -bottom-0.5 -right-0.5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="font-heading font-extrabold text-2xl text-white tracking-tight">
                  AgentWater<span className="text-mint-neon">Grid</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold bg-mint-neon/10 text-mint-neon border border-mint-neon/30">
                  <Activity className="w-3 h-3 animate-pulse" />
                  <span>STUDIONET 61999</span>
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
              title="Sync On-Chain State from GenLayer StudioNet"
              className="p-2.5 rounded-xl bg-cleantech-850 border border-cleantech-700 text-slate-300 hover:text-mint-neon hover:border-mint-neon/40 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-mint-neon' : ''}`} />
            </button>

            {/* Contract Address Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-cleantech-850 border border-cleantech-700 text-xs font-mono">
              <span className="text-slate-400">Contract:</span>
              <span className="text-mint-neon font-semibold">{shortenAddress(getSavedContractAddress(), 4)}</span>
              <button
                onClick={handleCopyContract}
                className="text-slate-400 hover:text-white transition"
                title="Copy Contract Address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-mint-neon" /> : <Copy className="w-3.5 h-3.5" />}
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
                <div className="hidden sm:flex flex-col items-end px-3.5 py-1 rounded-xl bg-cleantech-850 border border-cleantech-700 text-right">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Operator Balance</span>
                  <span className="text-xs font-mono font-bold text-mint-neon">{balance || '0.000'} GEN</span>
                </div>
                <button
                  onClick={onDisconnectWallet}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cleantech-800 hover:bg-cleantech-750 border border-cleantech-600 text-xs font-mono text-slate-200 transition shadow-lg"
                >
                  <span className="w-2 h-2 rounded-full bg-mint-neon animate-ping" />
                  <span className="font-semibold">{shortenAddress(walletAddress, 4)}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onConnectWallet}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-mint-neon via-emerald-400 to-aqua-cyan hover:opacity-95 text-cleantech-950 font-heading font-bold text-xs tracking-wider uppercase transition shadow-mint-glow"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl bg-cleantech-900 border border-cleantech-700 shadow-2xl space-y-4">
            <h3 className="font-heading text-lg font-bold text-white">Target StudioNet Contract</h3>
            <p className="text-xs text-slate-400">
              Contract deployed on GenLayer StudioNet (Chain ID: 61999).
            </p>
            <input
              type="text"
              value={tempAddress}
              onChange={(e) => setTempAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-cleantech-950 border border-cleantech-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-mint-neon"
              placeholder="0x..."
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContract}
                className="px-4 py-2 rounded-xl bg-mint-neon text-cleantech-950 font-heading font-bold text-xs uppercase tracking-wider hover:bg-emerald-300 transition shadow-mint-glow"
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
