import { formatGen } from '../utils/formatters';

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_ID_HEX = '0xF22F';
export const STUDIONET_RPC_URL = 'https://studio.genlayer.com/api';
export const STUDIO_URL = 'https://studio.genlayer.com';

// Authoritative Intelligent Contract deployed on GenLayer Studionet
export const DEFAULT_CONTRACT_ADDRESS = '0x933a7C4fCa26ECA2AE65F2d4537A68A0D18f7628';

export function getSavedContractAddress(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('agentwatergrid_contract_address');
      if (
        stored &&
        stored.trim().startsWith('0x') &&
        stored.trim().length === 42
      ) {
        return stored.trim();
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_CONTRACT_ADDRESS;
}

export function saveContractAddress(address: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('agentwatergrid_contract_address', address.trim());
  }
}

export async function fetchStudionetBalance(address: string): Promise<string> {
  if (!address) return '0.000';

  try {
    const res = await fetch(STUDIONET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: Date.now(),
      }),
    });
    const json = await res.json();
    if (json && json.result !== undefined && json.result !== null) {
      return formatGen(json.result);
    }
  } catch (err) {
    console.warn('Direct Studionet RPC eth_getBalance error:', err);
  }

  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const balHex = await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      if (balHex) {
        return formatGen(balHex);
      }
    } catch (e) {
      console.warn('MetaMask eth_getBalance fallback error:', e);
    }
  }

  return '0.000';
}

export const STATUS_POLICY_ACTIVE = 0;
export const STATUS_DEPLETION_ALERT = 1;
export const STATUS_AWAITING_PAYOUT = 2;
export const STATUS_SETTLED_RELIEF_PAID = 3;
export const STATUS_SETTLED_PARTIAL = 4;
export const STATUS_SETTLED_COMPLIANT = 5;
export const STATUS_DISPUTED = 6;
export const STATUS_EXPIRED_RECLAIMED = 7;
export const STATUS_UNRESOLVED = 8;

export interface WaterPolicyData {
  policy_id: string;
  enterprise: string;
  community_rep: string;
  dispute_initiator: string;
  escrow_amount: string;
  dispute_bond: string;
  aquifer_basin_id: string;
  max_tolerable_drawdown_m: number;
  max_salinity_tds_ppm: number;
  hydrology_feed_url: string;
  evidence_hash: string;
  status: number;
  verdict: string;
  original_verdict: string;
  reason: string;
  confidence: number;
  measured_drawdown_cm: number;
  measured_salinity_ppm: number;
  created_at_time: string;
  expires_at_time: string;
  audit_completed_time: string;
  supplemental_evidence_url?: string;
  appeal_prior_verdict?: string;
  created_at_block?: string;
  expires_at_block?: string;
  audit_completed_block?: string;
}

export interface GridStats {
  total_policies: number;
  total_water_locked: string;
  total_policies_settled: number;
  owner: string;
}

// GenVM Calldata Encoding Helpers
const TYPE_INT = 0;
const TYPE_STR = 1;
const TYPE_ARR = 2;
const TYPE_MAP = 3;
const TYPE_BYTES = 4;
const TYPE_BOOL = 5;
const TYPE_ADDRESS = 6;

function encodeNum(to: number[], n: bigint) {
  let val = n;
  while (val >= 0x80n) {
    to.push(Number((val & 0x7fn) | 0x80n));
    val >>= 7n;
  }
  to.push(Number(val & 0x7fn));
}

function encodeNumWithType(to: number[], n: bigint, type: number) {
  const combined = (n << 3n) | BigInt(type & 0x07);
  encodeNum(to, combined);
}

function encodeMap(to: number[], entries: [string, any][]) {
  encodeNumWithType(to, BigInt(entries.length), TYPE_MAP);
  for (const [k, v] of entries) {
    encodeVal(to, k);
    encodeVal(to, v);
  }
}

function encodeVal(to: number[], val: any) {
  if (val === null || val === undefined) {
    encodeNumWithType(to, 0n, TYPE_INT);
  } else if (typeof val === 'boolean') {
    encodeNumWithType(to, val ? 1n : 0n, TYPE_BOOL);
  } else if (typeof val === 'number') {
    encodeNumWithType(to, BigInt(val), TYPE_INT);
  } else if (typeof val === 'bigint') {
    encodeNumWithType(to, val, TYPE_INT);
  } else if (typeof val === 'string') {
    // Check if it's an EVM address
    if (val.startsWith('0x') && val.length === 42 && /^[0-9a-fA-F]+$/.test(val.slice(2))) {
      const hex = val.slice(2).toLowerCase();
      const bytes: number[] = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
      }
      encodeNumWithType(to, BigInt(bytes.length), TYPE_ADDRESS);
      for (const b of bytes) to.push(b);
    } else {
      const encoded = new TextEncoder().encode(val);
      encodeNumWithType(to, BigInt(encoded.length), TYPE_STR);
      for (const b of encoded) {
        to.push(b);
      }
    }
  } else if (Array.isArray(val)) {
    encodeNumWithType(to, BigInt(val.length), TYPE_ARR);
    for (const elem of val) {
      encodeVal(to, elem);
    }
  } else if (typeof val === 'object') {
    encodeMap(to, Object.entries(val));
  } else {
    throw new Error(`Unsupported type: ${typeof val}`);
  }
}

export function encodeCalldata(method: string, args: any[]): `0x${string}` {
  const res: number[] = [];
  encodeVal(res, method);
  encodeVal(res, args);
  encodeVal(res, {});
  return `0x${res.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export async function readContract(
  method: string,
  args: any[] = [],
  contractAddress: string = getSavedContractAddress()
): Promise<any> {
  const calldata = encodeCalldata(method, args);
  const res = await fetch(STUDIONET_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: contractAddress,
          data: calldata,
        },
        'latest',
      ],
      id: Date.now(),
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'GenLayer eth_call failed');
  }

  const result = data.result;
  if (!result || result === '0x') return null;

  try {
    if (typeof result === 'string' && result.startsWith('0x')) {
      const hex = result.slice(2);
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      }
      const jsonStart = str.indexOf('{');
      const jsonArrStart = str.indexOf('[');
      const start =
        jsonStart !== -1 && (jsonArrStart === -1 || jsonStart < jsonArrStart)
          ? jsonStart
          : jsonArrStart;
      if (start !== -1) {
        return JSON.parse(str.slice(start));
      }
      return str;
    }
    return JSON.parse(result);
  } catch {
    return result;
  }
}

export async function waitForTransactionReceipt(txHash: string, timeoutMs = 90000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [txHash],
          id: Date.now(),
        }),
      });
      const data = await res.json();
      const txData = data?.result;

      if (txData) {
        const execResultName = String(txData.tx_execution_result_name || '').toUpperCase();
        const execResultCode = String(txData.tx_execution_result || '');
        const statusName = String(txData.status_name || '').toUpperCase();
        const statusCode = String(txData.status || '');

        if (statusName === 'CANCELED' || statusCode === '8') {
          throw new Error('Transaction canceled by consensus.');
        }
        if (statusName === 'UNDETERMINED' || statusCode === '6') {
          throw new Error('Transaction outcome undetermined by validators.');
        }

        if (execResultName === 'FINISHED_WITH_ERROR' || execResultCode === '2') {
          const rawError =
            txData.genvm_result?.error_description ||
            txData.genvm_result?.stderr ||
            txData.error_description ||
            'Contract execution reverted on GenVM.';
          throw new Error(`Execution error: ${rawError}`);
        }

        if (execResultName === 'FINISHED_WITH_RETURN' || execResultCode === '1') {
          return txData;
        }

        if (
          statusName === 'FINALIZED' ||
          statusName === 'ACCEPTED' ||
          statusCode === '7' ||
          statusCode === '5'
        ) {
          return txData;
        }
      }

      // Check standard receipt
      const recRes = await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: Date.now(),
        }),
      });
      const recData = await recRes.json();
      if (recData?.result) {
        if (recData.result.status === '0x1' || recData.result.status === 1) {
          return recData.result;
        }
        if (recData.result.status === '0x0' || recData.result.status === 0) {
          throw new Error(`Transaction reverted (Tx: ${txHash})`);
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('Execution error') || e?.message?.includes('reverted')) {
        throw e;
      }
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Transaction confirmation timed out after ${timeoutMs / 1000}s`);
}

export async function writeContractWithMetaMask(
  method: string,
  args: any[],
  valueWei: bigint = 0n,
  contractAddress: string = getSavedContractAddress()
): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask or Web3 wallet not detected. Please install MetaMask to execute on-chain transactions.');
  }

  const ethereum = (window as any).ethereum;

  // Ensure StudioNet (Chain ID: 61999 / 0xF22F)
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: STUDIONET_CHAIN_ID_HEX,
            chainName: 'GenLayer StudioNet',
            rpcUrls: [STUDIONET_RPC_URL],
            nativeCurrency: {
              name: 'GEN',
              symbol: 'GEN',
              decimals: 18,
            },
            blockExplorerUrls: [STUDIO_URL],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }

  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  const fromAddress = accounts[0];
  const calldata = encodeCalldata(method, args);

  const txParams: any = {
    from: fromAddress,
    to: contractAddress,
    data: calldata,
  };

  if (valueWei > 0n) {
    txParams.value = `0x${valueWei.toString(16)}`;
  }

  const txHash = await ethereum.request({
    method: 'eth_sendTransaction',
    params: [txParams],
  });

  return txHash;
}
