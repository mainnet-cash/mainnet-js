import get from "axios";

// Attempt to get the usd rate from some web app
export async function getUsdRate(): Promise<number> {
  try {
    let response = await get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd"
    );
    return response.data["bitcoin-cash"].usd;
  } catch (e1) {
    try {
      let response = await get("https://markets.api.bitcoin.com/live/bitcoin");
      return response.data["data"]["BCH"];
    } catch (e2) {
      return e2;
    }
  }
}
