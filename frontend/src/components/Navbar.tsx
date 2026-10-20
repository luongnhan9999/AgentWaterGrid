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
  Radio,
  Cpu,
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
    <header className="sticky top-0 z-40 bg-obsidian-950/95 backdrop-blur-md border-b border-obsidian-800 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Protocol Title */}
          <div className="flex items-center space-x-3.5">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-mint/20 via-obsidian-850 to-neon-cyan/20 border border-neon-mint/40 shadow-neon-glow">
              <Droplets className="w-6 h-6 text-neon-mint" />
              <span className="w-2.5 h-2.5 rounded-full bg-neon-cyan absolute -bottom-0.5 -right-0.5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="font-heading font-extrabold text-2xl text-white tracking-tight">
                  AgentWater<span className="text-neon-mint">Grid</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold bg-neon-mint/10 text-neon-mint border border-neon-mint/30">
                  <Activity className="w-3 h-3 animate-pulse" />
                  <span>STUDIONET 61999</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-tight hidden sm:block">
                Autonomous Desalination & Groundwater Depletion Parametric Escrow
              </p>
            </div>
          </div>

          {/* Center Protocol Live Telemetry Strip (hidden on mobile) */}
          <div className="hidden xl:flex items-center space-x-4 px-4 py-1.5 rounded-xl bg-obsidian-900 border border-obsidian-800 text-[11px] font-mono text-slate-300">
            <span className="flex items-center text-neon-mint">
              <Radio className="w-3 h-3 mr-1.5 animate-ping" />
              ORACLE ACTIVE
            </span>
            <span className="text-obsidian-750">|</span>
            <span className="text-slate-400">
              USGS & COPERNICUS WHITELISTED
            </span>
            <span className="text-obsidian-750">|</span>
            <span className="text-neon-cyan flex items-center">
              <Cpu className="w-3 h-3 mr-1" />
              GENVM CONSENSUS
            </span>
          </div>

          {/* Action Toolbar & Wallet */}
          <div className="flex items-center space-x-3">
            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-obsidian-900 hover:bg-obsidian-850 text-slate-300 hover:text-neon-mint border border-obsidian-800 transition"
              title="Refresh on-chain data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-neon-mint' : ''}`} />
            </button>

            {/* Contract Quick Pill */}
            <button
              onClick={handleCopyContract}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-obsidian-900 hover:bg-obsidian-850 border border-obsidian-800 text-xs font-mono text-slate-300 transition"
              title="Copy Smart Contract Address"
            >
              <span className="text-slate-400">Contract:</span>
              <span className="text-neon-cyan">{shortenAddress(getSavedContractAddress())}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-neon-mint" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
              )}
            </button>

            {/* Network Switcher Button */}
            <button
              onClick={handleSwitchNetwork}
              className="hidden md:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-obsidian-900 hover:bg-obsidian-850 border border-obsidian-800 text-xs font-mono text-slate-300 transition"
              title="Switch or Add StudioNet to Wallet"
            >
              <span className="w-2 h-2 rounded-full bg-neon-mint animate-pulse" />
              <span>StudioNet</span>
            </button>

            {/* Contract Settings Toggle */}
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2.5 rounded-xl bg-obsidian-900 hover:bg-obsidian-850 text-slate-300 hover:text-white border border-obsidian-800 transition"
              title="Configure Contract Address"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Wallet Connect / User Balance HUD */}
            {walletAddress ? (
              <div className="flex items-center space-x-2 p-1.5 pr-3 rounded-2xl bg-obsidian-900 border border-neon-mint/30 shadow-neon-glow">
                <div className="px-3 py-1.5 rounded-xl bg-obsidian-950 font-mono text-xs text-white border border-obsidian-800">
                  <span className="text-slate-400 text-[10px] mr-1">GEN:</span>
                  <strong className="text-neon-mint font-bold">{balance}</strong>
                </div>

                <div className="flex items-center space-x-2 pl-1">
                  <div className="w-2 h-2 rounded-full bg-neon-mint animate-pulse" />
                  <span className="text-xs font-mono text-slate-200">
                    {shortenAddress(walletAddress)}
                  </span>
                  <button
                    onClick={onDisconnectWallet}
                    className="text-[10px] font-mono text-slate-400 hover:text-alert-crimson ml-1 transition"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onConnectWallet}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-mint to-neon-cyan hover:from-emerald-400 hover:to-cyan-400 text-obsidian-950 font-heading font-bold text-xs uppercase tracking-wider transition shadow-neon-glow"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>

        {/* Contract Address Override Settings Dropdown */}
        {isSettingsOpen && (
          <div className="p-4 mb-4 rounded-2xl bg-obsidian-900 border border-obsidian-750 shadow-2xl text-xs space-y-3 font-mono animate-fadeIn">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span>GenLayer Smart Contract Configuration</span>
              <a
                href={`${STUDIO_URL}/contracts/${getSavedContractAddress()}`}
                target="_blank"
                rel="noreferrer"
                className="text-neon-cyan hover:underline flex items-center"
              >
                <span>View on Studio</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={tempAddress}
                onChange={(e) => setTempAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1 px-3 py-2 rounded-xl bg-obsidian-950 border border-obsidian-750 text-slate-100 font-mono text-xs focus:outline-none focus:border-neon-mint transition"
              />
              <button
                onClick={handleSaveContract}
                className="px-4 py-2 rounded-xl bg-neon-mint text-obsidian-950 font-bold hover:bg-emerald-400 transition"
              >
                Save & Reload
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Deployed contract address on GenLayer StudioNet. Changes persist in local browser storage.
            </p>
          </div>
        )}
      </div>
    </header>
  );
};
