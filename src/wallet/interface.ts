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
}

export interface WalletI {
  /**
   * generate should randomly create a new wallet
   * @returns A randomly generated instance.
   */
  generate(): Promise<any>;

  /**
   * toString should retrun a serialized representation of the Wallet
   * @returns returns a serialized representation of the wallet
   */
  toString(): string;
}
