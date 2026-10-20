export function formatGen(weiValue: string | number | bigint | undefined | null, decimals = 4): string {
  try {
    if (weiValue === null || weiValue === undefined) return '0.000';
    const str = String(weiValue).trim();
    if (!str || str === '0x' || str === '0') return '0.000';

    // If already formatted like "0.018", parse float
    if (str.includes('.') && !str.startsWith('0x') && !str.startsWith('0X')) {
      const num = parseFloat(str);
      return isNaN(num) ? '0.000' : num.toFixed(decimals);
    }

    let val: bigint;
    if (str.startsWith('0x') || str.startsWith('0X')) {
      val = BigInt(str);
    } else {
      val = BigInt(str.replace(/\..*$/, ''));
    }

    const base = 10n ** 18n;
    const whole = val / base;
    const remainder = val % base;

    if (remainder === 0n) {
      return whole.toString() + '.000';
    }

    const remStr = remainder.toString().padStart(18, '0').slice(0, decimals);
    const trimmed = remStr.replace(/0+$/, '');
    return trimmed ? `${whole}.${trimmed}` : `${whole}.000`;
  } catch {
    return '0.000';
  }
}

export function parseGenToWei(genAmount: string | number | undefined | null): bigint {
  try {
    if (!genAmount) return 0n;
    const str = String(genAmount).trim();
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

export function shortenAddress(address: string | undefined | null, chars = 4): string {
  if (!address) return '';
  const str = String(address).trim();
  if (str.length < chars * 2 + 2) return str;
  return `${str.slice(0, chars + 2)}...${str.slice(-chars)}`;
}

export function formatTimestamp(timestamp: string | number | bigint | undefined | null): string {
  try {
    if (!timestamp) return 'Active Policy';
    const t = Number(timestamp);
    if (!t || isNaN(t) || t === 0) return 'Active Policy';
    const ms = t < 1e11 ? t * 1000 : t;
    return new Date(ms).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Active Policy';
  }
}

export function formatDrawdown(cm: number | undefined | null): string {
  const val = Number(cm || 0);
  if (val >= 100) {
    return `${(val / 100).toFixed(2)} m (${val} cm)`;
  }
  return `${val} cm`;
}

export function formatSalinity(ppm: number | undefined | null): { text: string; safety: 'SAFE' | 'WARNING' | 'CRITICAL' } {
  const val = Number(ppm || 0);
  if (val <= 500) {
    return { text: `${val} PPM (EPA Potable)`, safety: 'SAFE' };
  } else if (val <= 1000) {
    return { text: `${val} PPM (Moderate Saline)`, safety: 'WARNING' };
  } else {
    return { text: `${val} PPM (Critical Salt Intrusion)`, safety: 'CRITICAL' };
  }
}

export interface StatusMetadata {
  label: string;
  badgeClass: string;
  borderClass: string;
  glowClass: string;
  description: string;
}

export function getStatusMetadata(status: number | undefined | null): StatusMetadata {
  const s = Number(status ?? 0);
  switch (s) {
    case 0:
      return {
        label: 'POLICY ACTIVE',
        badgeClass: 'bg-mint-neon/10 text-mint-neon border-mint-neon/30',
        borderClass: 'border-mint-neon/30 hover:border-mint-neon/60',
        glowClass: 'shadow-mint-glow',
        description: 'Indemnity escrow locked. Sustainable extraction SLA monitored.',
      };
    case 1:
      return {
        label: 'DEPLETION ALERT FILED',
        badgeClass: 'bg-warning-amber/15 text-warning-amber border-warning-amber/40 animate-pulse',
        borderClass: 'border-warning-amber/50 hover:border-warning-amber',
        glowClass: 'shadow-amber-glow',
        description: 'USGS/Copernicus sensor feed bound. Ready for AI Tribunal adjudication.',
      };
    case 2:
      return {
        label: 'AWAITING PAYOUT',
        badgeClass: 'bg-aqua-cyan/15 text-aqua-cyan border-aqua-cyan/40',
        borderClass: 'border-aqua-cyan/50 hover:border-aqua-cyan',
        glowClass: 'shadow-aqua-glow',
        description: 'AI Tribunal evaluated. 24-block (~72s) appeal window active.',
      };
    case 3:
      return {
        label: 'SEVERE DEPLETION (100% RELIEF)',
        badgeClass: 'bg-danger-crimson/15 text-danger-crimson border-danger-crimson/40',
        borderClass: 'border-danger-crimson/50 hover:border-danger-crimson',
        glowClass: 'shadow-crimson-glow',
        description: 'Critical drawdown breach confirmed. 100% relief disbursed to community.',
      };
    case 4:
      return {
        label: 'PARTIAL PENALTY (40% RELIEF)',
        badgeClass: 'bg-warning-amber/15 text-warning-amber border-warning-amber/40',
        borderClass: 'border-warning-amber/40 hover:border-warning-amber',
        glowClass: 'shadow-amber-glow',
        description: 'Moderate drawdown warning breach. 40% relief paid, 60% preserved.',
      };
    case 5:
      return {
        label: 'COMPLIANT (CLEAN RECHARGE)',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
        borderClass: 'border-emerald-500/40 hover:border-emerald-500',
        glowClass: 'shadow-mint-glow',
        description: 'Aquifer table compliant. 100% escrow refunded to enterprise.',
      };
    case 6:
      return {
        label: 'DISPUTED (UNDER APPEAL)',
        badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/40 animate-pulse',
        borderClass: 'border-purple-500/50 hover:border-purple-400',
        glowClass: 'shadow-[0_0_25px_-5px_rgba(168,85,247,0.35)]',
        description: '10% bond staked. Supreme Appellate Magistrate review active.',
      };
    case 7:
      return {
        label: 'EXPIRED (RECLAIMED)',
        badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-600',
        borderClass: 'border-slate-700',
        glowClass: '',
        description: 'Coverage period concluded without breach. Escrow reclaimed.',
      };
    case 8:
      return {
        label: 'UNRESOLVED (PROTECTED)',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        borderClass: 'border-rose-500/50',
        glowClass: '',
        description: 'Sensor endpoint offline or canary mismatch. Escrow remains protected.',
      };
    default:
      return {
        label: 'UNKNOWN STATUS',
        badgeClass: 'bg-slate-700 text-slate-300 border-slate-600',
        borderClass: 'border-slate-700',
        glowClass: '',
        description: 'Status unrecognized.',
      };
  }
}
