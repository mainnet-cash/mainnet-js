import { wordlist as english } from "@scure/bip39/wordlists/english";
import { WORDLIST_CHECKSUMS } from "./constant.js";
import { sha256, binToHex, utf8ToBin } from "@bitauth/libauth";

export class Config {
  // enforces all token-related methods to specify tokenaddr as recepient and change cashaddr
  static EnforceCashTokenReceiptAddresses = false;
  static DefaultParentDerivationPath = "m/44'/0'/0'";
  static DefaultIpfsGateway = "https://dweb.link/ipfs/";
  // default currency for balance and rate conversions
  static DefaultCurrency = "usd";
  // caches the raw transactions in browser's local storage instead of memory
  static UseLocalStorageCache = false;
  // caches the raw transactions in browser's indexedDB instead of memory
  static UseIndexedDBCache = false;
  // caches the raw transactions in browser's memory
  static UseMemoryCache = false;
  private static DefaultWordlist = english;

  public static setIpfsGateway(ipfsGateway: string) {
    this.DefaultIpfsGateway = ipfsGateway;
  }

  public static setWordlist(wordlist: string[]) {
    let checksum = binToHex(sha256.hash(utf8ToBin(wordlist.join(" "))));
    if (!Object.values(WORDLIST_CHECKSUMS).includes(checksum))
      throw Error(
        "Error matching provided wordlist to a known list, see @scure/bip39/wordlists"
      );
    Config.DefaultWordlist = wordlist;
  }

  public static getWordlist(): string[] {
    return [...Config.DefaultWordlist];
  }

  // custom exchange rate function
  public static GetExchangeRateFn:
    | ((symbol: string) => Promise<number>)
    | undefined = undefined;
}
