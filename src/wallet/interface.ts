import { WalletTypeEnum } from "./enum";
import { NetworkEnum } from "../enum";

export interface WalletRequestI {
  name?: string;
  network?: string;
  type?: WalletTypeEnum;
}

export interface WalletResponseI {
  name: string;
  cashaddr: string;
  walletId: string;
  network?: NetworkEnum;
  wif?: string;
  seed?: MnemonicI;
}

export interface WalletInfoI {
  cashaddr?: string;
  isTestnet?: boolean;
  name?: string;
  network: NetworkEnum;
  seed?: MnemonicI;
  publicKey?: string;
  publicKeyHash?: string;
  privateKey?: string;
  privateKeyWif?: string;
  walletId: string;
  walletDbEntry: string;
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
