import { ExchangeRateI } from "./interface.js";

export default class ExchangeRateProvider {
  /*
   *   Exchange Rate functions
   */

  public async getRate(symbol: string): Promise<ExchangeRateI | undefined> {
    const valueString = localStorage.getItem(`rate-${symbol}`);
    if (valueString) {
      return JSON.parse(valueString) as ExchangeRateI;
    }

    return undefined;
  }

  public async setRate(
    symbol: string,
    rate: number,
    ttl: number
  ): Promise<boolean> {
    localStorage.setItem(
      `rate-${symbol}`,
      JSON.stringify({ symbol: symbol, rate: rate, ttl: ttl })
    );
    return true;
  }
}
