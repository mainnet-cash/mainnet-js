export class Config {
  // enforces all token-related methods to specify tokenaddr as recepient and change cashaddr
  static EnforceCashTokenReceiptAddresses = false;
  static DefaultParentDerivationPath = "m/44'/0'/0'";
  static DefaultIpfsGateway = "https://ipfs.io/ipfs/";

  public static setIpfsGateway(ipfsGateway: string) {
    this.DefaultIpfsGateway = ipfsGateway;
  }
}
