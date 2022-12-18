import BigNumber from "bignumber.js";
import { UtxoI, TxI } from "../interface.js";

export enum SlpTokenType {
  Type1 = 0x01,
  NftParent = 0x81,
  NftChild = 0x41,
}

export interface SlpDbResponse {
  t: any[];
  u: any[];
  c: any[];
  g: any[];
  a: any[];
  x: any[];
  s: any[];
}

export interface SlpDbTx {
  tx: any;
  in: any[];
  out: any[];
  slp: any;
  blk: any;
}

export interface GsppTx {
  inputs: string[];
  outputs: string[];
  tokenId: string;
  groupId: string;
  type: SlpTokenType;
  ticker: string;
  decimals: number;
  txType: string;
  txHash: string;
}

export interface SlpTxI extends TxI {
  details: SlpDbTx | GsppTx;
}

export interface SlpUtxoI extends UtxoI {
  value: BigNumber;
  decimals: number;
  ticker: string;
  tokenId: string;
  type: SlpTokenType;
  isBaton: boolean;
}

export interface SlpFormattedUtxo {
  ticker: string;
  tokenId: string;
  value: string;
  satoshis: number;
  decimals: number;
  txId: string;
  index: number;
  utxoId: string;
  type: SlpTokenType;
}

export interface SlpTokenBalance {
  value: BigNumber;
  ticker: string;
  name: string;
  tokenId: string;
  type: SlpTokenType;
  decimals: number;
}

export interface SlpSendRequest {
  slpaddr: string;
  value: BigNumber.Value;
  tokenId: string;
}

export interface SlpTokenInfo {
  name: string;
  ticker: string;
  tokenId: string;
  parentTokenId: string;
  initialAmount: BigNumber.Value;
  decimals: number;
  documentUrl?: string;
  documentHash?: string;
  type: SlpTokenType;
}

export interface SlpGenesisOptions {
  name: string;
  ticker: string;
  initialAmount: BigNumber.Value;
  decimals: number;
  documentUrl?: string;
  documentHash?: string;
  endBaton?: boolean;
  type?: SlpTokenType;
  tokenReceiverSlpAddr?: string;
  batonReceiverSlpAddr?: string;
  parentTokenId?: string;
}

export interface SlpMintOptions {
  value: BigNumber.Value;
  tokenId: string;
  endBaton?: boolean;
  tokenReceiverSlpAddr?: string;
  batonReceiverSlpAddr?: string;
}

export interface SlpGenesisResult {
  tokenId: string;
  balance: SlpTokenBalance;
}

export interface SlpSendResponse {
  txId: string;
  balance: SlpTokenBalance;
  explorerUrl: string;
}

export interface SlpMintResult {
  txId: string;
  balance: SlpTokenBalance;
}
