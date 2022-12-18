import { NetworkType } from "../enum.js";

export function checkWifNetwork(
  walletImportFormatString: string,
  networkType: NetworkType
) {
  if (
    !(
      walletImportFormatString[0] === "L" || walletImportFormatString[0] === "K"
    ) &&
    networkType === NetworkType.Mainnet
  ) {
    throw Error(
      `Mainnet type wif ${walletImportFormatString} passed, should start with L or K`
    );
  } else if (
    walletImportFormatString[0] !== "c" &&
    networkType === NetworkType.Testnet
  ) {
    throw Error(
      `Testnet type wif ${walletImportFormatString} passed, should start with c`
    );
  }
}
