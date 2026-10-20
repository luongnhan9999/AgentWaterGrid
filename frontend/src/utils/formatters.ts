export function formatGen(weiValue: string | number | bigint, decimals = 4): string {
  try {
    const val = BigInt(weiValue.toString());
    const base = 10n ** 18n;
    const whole = val / base;
    const remainder = val % base;

    if (remainder === 0n) {
      return whole.toString();
    }

    const remStr = remainder.toString().padStart(18, '0').slice(0, decimals);
    const trimmed = remStr.replace(/0+$/, '');
    return trimmed ? `${whole}.${trimmed}` : whole.toString();
  } catch {
    return '0';
  }
}

export function parseGenToWei(genAmount: string | number): bigint {
  try {
    const str = genAmount.toString().trim();
    if (!str || isNaN(Number(str))) return 0n;
    const [whole, decimal = ''] = str.split('.');
    const paddedDecimal = decimal.padEnd(18, '0').slice(0, 18);
    const wholeWei = BigInt(whole || '0') * 10n ** 18n;
    const decimalWei = BigInt(paddedDecimal || '0');
    return wholeWei + decimalWei;
  } catch {
    return 0n;
  }
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 2) return address || '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatTimestamp(timestamp: string | number | bigint): string {
  try {
    const t = Number(timestamp);
    if (!t || t === 0) return 'N/A';
    // If timestamp is in seconds, convert to ms
    const ms = t < 1e11 ? t * 1000 : t;
    return new Date(ms).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'N/A';
  }
}

export function formatDrawdown(cm: number): string {
  if (cm >= 100) {
    return `${(cm / 100).toFixed(2)} m (${cm} cm)`;
  }
  return `${cm} cm`;
}

export function formatSalinity(ppm: number): { text: string; safety: 'SAFE' | 'WARNING' | 'CRITICAL' } {
  if (ppm <= 500) {
    return { text: `${ppm} PPM (EPA Potable)`, safety: 'SAFE' };
  } else if (ppm <= 1000) {
    return { text: `${ppm} PPM (Moderate Mineralized)`, safety: 'WARNING' };
  } else {
    return { text: `${ppm} PPM (Severe Saline Intrusion)`, safety: 'CRITICAL' };
  }
}

export interface StatusMetadata {
  label: string;
  badgeClass: string;
  borderClass: string;
  glowClass: string;
  description: string;
}

export function getStatusMetadata(status: number): StatusMetadata {
  switch (status) {
    case 0:
      return {
        label: 'POLICY ACTIVE',
        badgeClass: 'bg-aquatic-cyan/15 text-aquatic-cyan border-aquatic-cyan/40',
        borderClass: 'border-aquatic-cyan/40',
        glowClass: 'shadow-hydro-glow',
        description: 'Indemnity escrow locked. Actively monitored for aquifer drawdown.',
      };
    case 1:
      return {
        label: 'DEPLETION ALERT FILED',
        badgeClass: 'bg-penalty-amber/15 text-penalty-amber border-penalty-amber/40 animate-pulse-fast',
        borderClass: 'border-penalty-amber/50',
        glowClass: 'shadow-penalty-glow',
        description: 'Sensor telemetry submitted. Awaiting GenLayer AI Tribunal verification.',
      };
    case 2:
      return {
        label: 'AWAITING PAYOUT (COOLING-OFF)',
        badgeClass: 'bg-penalty-amber/20 text-penalty-amber border-penalty-amber/60',
        borderClass: 'border-penalty-amber/60',
        glowClass: 'shadow-penalty-glow',
        description: 'Verdict rendered. 24-block (~72s) appeal window active.',
      };
    case 3:
      return {
        label: 'SEVERE DEPLETION (100% RELIEF)',
        badgeClass: 'bg-depletion-red/15 text-depletion-red border-depletion-red/40',
        borderClass: 'border-depletion-red/50',
        glowClass: 'shadow-depletion-glow',
        description: 'Severe aquifer drawdown breached safety SLA. 100% relief disbursed to community.',
      };
    case 4:
      return {
        label: 'PARTIAL DRAWDOWN (40% PENALTY)',
        badgeClass: 'bg-penalty-amber/15 text-penalty-amber border-penalty-amber/40',
        borderClass: 'border-penalty-amber/40',
        glowClass: 'shadow-penalty-glow',
        description: 'Moderate water table drop detected. 40% penalty disbursed, 60% preserved.',
      };
    case 5:
      return {
        label: 'AQUIFER COMPLIANT (CLEAN)',
        badgeClass: 'bg-compliant-emerald/15 text-compliant-emerald border-compliant-emerald/40',
        borderClass: 'border-compliant-emerald/40',
        glowClass: 'shadow-compliant-glow',
        description: 'Water table compliant with ecological standards. 100% escrow refunded to enterprise.',
      };
    case 6:
      return {
        label: 'DISPUTED (UNDER APPEAL)',
        badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/40 animate-pulse',
        borderClass: 'border-purple-500/50',
        glowClass: 'shadow-[0_0_25px_-5px_rgba(168,85,247,0.35)]',
        description: '10% bond staked. Appellate review active with supplemental observation data.',
      };
    case 7:
      return {
        label: 'EXPIRED (RECLAIMED)',
        badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/40',
        borderClass: 'border-slate-700',
        glowClass: '',
        description: 'Policy term concluded without breach. Escrow reclaimed by enterprise.',
      };
    case 8:
      return {
        label: 'UNRESOLVED (PROTECTED)',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
        borderClass: 'border-rose-500/50',
        glowClass: '',
        description: 'Telemetry or canary error. Escrow remains strictly non-settling & protected.',
      };
    default:
      return {
        label: 'UNKNOWN STATUS',
        badgeClass: 'bg-slate-700 text-slate-300 border-slate-600',
        borderClass: 'border-slate-700',
        glowClass: '',
        description: 'Unknown state.',
      };
  }
}
