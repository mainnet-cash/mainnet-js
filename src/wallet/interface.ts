import { WalletTypeEnum } from "./enum";
import { NetworkEnum, NetworkType } from "../enum";
import { UtxoItem } from "./model";
import { ImageI } from "../qr/interface";

export interface WalletRequestI {
  name?: string;
  network?: string;
  type?: WalletTypeEnum;
  platform?: string;
  walletId?: string;
}

export interface WalletResponseI {
  name: string;
  cashaddr?: string;
  slpaddr?: string;
  address?: string;
  walletId: string;
  network?: NetworkEnum;
  wif?: string;
  seed?: string;
  derivationPath?: string;
}

export interface WalletInfoI {
  cashaddr?: string;
  isTestnet?: boolean;
  name?: string;
  network: NetworkEnum;
  seed?: string;
  derivationPath?: string;
  publicKey?: string;
  publicKeyHash?: string;
  privateKey?: string;
  privateKeyWif?: string;
  walletId: string;
  walletDbEntry: string;
}

export interface SendRequestOptionsI {
  utxoIds?: string[];
  changeAddress?: string;
  slpAware?: boolean;
  queryBalance?: boolean;
  awaitTransactionPropagation?: boolean;
}

export interface MnemonicI {
  seed: string;
  derivationPath: string;
}

export interface WalletI {
  // Accessors
  getDepositAddress(): string;
  getDepositQr(): ImageI;
  getSeed(): MnemonicI;
  // getNetworkProvider(network: NetworkType): any;
  // generate(): Promise<this>;

  // Serialization
  toString(): string;
  toDbString(): string;

  // Static constructors
  // fromId(walletId: string): Promise<this>;
  // fromSeed(mnemonic: string, derivationPath?: string): Promise<this>;
  // newRandom(name: string, dbName?: string): Promise<this>;
  // watchOnly(address: string): Promise<this>;
  // named(name: string, dbName?: string, forceNew?: boolean): Promise<this>;
  // namedExists(name: string, dbName?: string): Promise<boolean>;

  // Funds
  getBalance(rawUnit?: any): Promise<any>;
  getMaxAmountToSend(params?: any): Promise<any>;
  send(requests: any, options?: any): Promise<any>;
  sendMax(address: string, options?: any): Promise<any>;
}
