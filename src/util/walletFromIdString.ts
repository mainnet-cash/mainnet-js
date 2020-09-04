import { WalletType, Network } from "../wallet/Base";
import { Wallet, TestnetWallet, RegTestWallet } from "../wallet/Wif";

export async function walletFromIdString(
  walletId: string
): Promise<Wallet | TestnetWallet | RegTestWallet> {
  let walletParam: string[] = walletId.split(":");

  let walletType =
    walletParam.shift() ||
    ((function () {
      throw "Error parsing wallet type";
    })() as WalletType.TypeEnum);
  let networkType =
    walletParam.shift() ||
    ((function () {
      throw "Error parsing network name";
    })() as Network.NetworkEnum);
  let privateImport: string =
    walletParam.shift() ||
    (function () {
      throw "Error parsing private key";
    })();
  let wallet: any;
  switch (walletType) {
    case WalletType.TypeEnum.Wif:
      switch (networkType) {
        case Network.NetworkEnum.Mainnet:
          wallet = new Wallet();
          await wallet.fromWIF(privateImport);
          break;
        case Network.NetworkEnum.Testnet:
          wallet = new TestnetWallet();
          await wallet.fromWIF(privateImport);
          break;
        case Network.NetworkEnum.Regtest:
          wallet = new RegTestWallet();
          await wallet.fromWIF(privateImport);
          break;
        default:
          throw Error("The network of the wif wallet was not understood.");
      }
      break;
    case WalletType.TypeEnum.Hd:
      throw Error("Heuristic Wallets are not implemented");
    default:
      throw Error("The wallet type was not understood");
  }
  return wallet;
}
