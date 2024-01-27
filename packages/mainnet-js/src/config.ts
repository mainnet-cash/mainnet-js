import { wordlist as english } from "@scure/bip39/wordlists/english";
import { WORDLIST_CHECKSUMS } from "./constant.js";
import { sha256, binToHex, utf8ToBin} from "@bitauth/libauth";

export class Config {
  // enforces all token-related methods to specify tokenaddr as recepient and change cashaddr
  static EnforceCashTokenReceiptAddresses = false;
  static DefaultParentDerivationPath = "m/44'/0'/0'";
  static DefaultIpfsGateway = "https://dweb.link/ipfs/";
  private static DefaultWordlist = english;

  public static setIpfsGateway(ipfsGateway: string) {
    this.DefaultIpfsGateway = ipfsGateway;
  }

  public static setWordlist(wordlist: string[]){
    let checksum = binToHex(sha256.hash(utf8ToBin(wordlist.join(" ")))) 
    if(!Object.values(WORDLIST_CHECKSUMS).includes(checksum)) throw Error("Setting a custom word list is not allowed")
    Config.DefaultWordlist = wordlist
  }

  public static getWordlist(): string[]{
    return [... Config.DefaultWordlist]
  }
}
