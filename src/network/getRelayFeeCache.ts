import { bchParam } from "../chain";
import { Network } from "../interface";
import { networkTickerMap } from "./constant";
import { default as NetworkProvider } from "./NetworkProvider";

export async function getRelayFeeCache(provider: NetworkProvider) {
  let relayFeePerKbInCoins;
  if (networkTickerMap[provider.network] + "_RELAY_FEE" in globalThis) {
    // Stores the fee in BCH_RELAY_FEE, BCHt_RELAY_FEE, etc
    relayFeePerKbInCoins =
      globalThis[networkTickerMap[provider.network] + "_RELAY_FEE"];
  }
  if (typeof relayFeePerKbInCoins !== "number") {
    relayFeePerKbInCoins = await provider.getRelayFee();
    if(provider.network==Network.TESTNET){
      relayFeePerKbInCoins += 0.00001
    }
    globalThis[
      networkTickerMap[provider.network] + "_RELAY_FEE"
    ] = relayFeePerKbInCoins;
  }
  if (typeof relayFeePerKbInCoins === "number") {
    return Math.round(relayFeePerKbInCoins * bchParam.subUnits) / 1000;
  } else {
    console.warn("Couldn't get min relay fee, using default instead");
    return Math.round(0.00001 * bchParam.subUnits) / 1000;
  }
}
