import { ClusterOrder } from "electrum-cash";
import { NFTCapability } from "../interface";

export interface BlockHeader {
  height: number;
  hex: string;
}

export interface ElectrumHostParams {
  host: string;
  port: number;
  scheme: "tcp" | "tcp_tls" | "ws" | "wss" | undefined;
}

export interface ElectrumClusterParams {
  confidence: number;
  distribution: number;
  order: ClusterOrder;
  timeout: number;
}

export interface ElectrumTokenData {
  amount: string;
  category: string;
  nft?: {
    capability?: NFTCapability;
    commitment?: string;
  };
}

export interface ElectrumUtxo {
  tx_pos: number;
  value: number;
  tx_hash: string;
  height: number;
  token_data?: ElectrumTokenData;
}

export interface ElectrumRawTransaction {
  blockhash: string;
  blocktime: number;
  confirmations: number;
  hash: string;
  hex: string;
  locktime: number;
  size: number;
  time: number;
  txid: string;
  version: number;
  vin: ElectrumRawTransactionVin[];
  vout: ElectrumRawTransactionVout[];
}

export interface ElectrumRawTransactionVinScriptSig {
  asm: string;
  hex: string;
}

export interface ElectrumRawTransactionVin {
  scriptSig: ElectrumRawTransactionVinScriptSig;
  sequence: number;
  txid: string;
  vout: number;
  value?: number; // optional extention by mainnet.cash
  address?: string; // optional extension by mainnet.cash
  tokenData?: ElectrumTokenData; // optional extension by mainnet.cash
}

export interface ElectrumRawTransactionVout {
  n: number;
  scriptPubKey: ElectrumRawTransactionVoutScriptPubKey;
  value: number;
  tokenData?: ElectrumTokenData;
}

export interface ElectrumRawTransactionVoutScriptPubKey {
  addresses: string[];
  asm: string;
  hex: string;
  reqSigs: number;
  type: string;
}
