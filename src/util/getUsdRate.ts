const axios = require("axios");

export async function getUsdRate(): Promise<number> {
  try {
    let response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd"
    );
    return response.data["bitcoin-cash"].usd;
  } catch (e1) {
    try {
      let response = await axios.get(
        "https://markets.api.bitcoin.com/live/bitcoin"
      );
      return response.data["data"]["BCH"];
    } catch (e2) {
      return e2;
    }
  }
}
