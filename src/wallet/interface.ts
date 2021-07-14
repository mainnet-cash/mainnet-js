import { WalletTypeEnum } from "./enum";
import { NetworkEnum } from "../enum";
import { UtxoItem } from "./model";

export interface WalletRequestI {
  name?: string;
  network?: string;
  type?: WalletTypeEnum;
}

export interface WalletResponseI {
  name: string;
  cashaddr: string;
  slpaddr: string;
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
}

export interface MnemonicI {
  seed: string;
  derivationPath: string;
}

export interface WalletI {
  /**
   * generate should randomly create a new wallet
   * @returns A randomly generated instance.
   */
  generate(): Promise<any>;

  /**
   * toString should return a serialized representation of the Wallet
   * @returns returns a serialized representation of the wallet
   */
  toString(): string;
}
