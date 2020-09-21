import { NetworkType } from "../wallet/enum";

export  function checkWifNetwork(
  walletImportFormatString: string,
  networkType: NetworkType
) {
  if (
    (walletImportFormatString[0] === "L" ||
      walletImportFormatString[0] === "K") &&
    networkType !== NetworkType.Mainnet
  ) {
    throw Error("attempted to pass a testnet Wif to a mainnet wallet");
  } else if (
    walletImportFormatString[0] === "c" &&
    networkType !== NetworkType.Testnet
  ) {
    throw Error("attempted to pass a mainnet Wif to a testnet wallet");
  }
}
