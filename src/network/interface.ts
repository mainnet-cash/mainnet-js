import { ClusterOrder } from "electrum-cash";

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

export interface ElectrumUtxo {
  tx_pos: number;
  value: number;
  tx_hash: string;
  height: number;
}

export interface ElectrumRawTransaction {
  blockhash: string;
  blocktime: number;
  configrmations: number;
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
  ams: string;
  hex: string;
}

export interface ElectrumRawTransactionVin {
  scriptSig: ElectrumRawTransactionVinScriptSig;
  sequence: number;
  txid: string;
  vout: number;
}

export interface ElectrumRawTransactionVout {
  n: number;
  scriptPubKey: ElectrumRawTransactionVoutScriptPubKey;
  value: number;
}

export interface ElectrumRawTransactionVoutScriptPubKey {
  addresses: string[];
  asm: string;
  hex: string;
  reqSigs: number;
  type: string;
}
