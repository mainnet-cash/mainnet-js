import { EXCHANGE_RATE_TTL } from "../constant";
import { RuntimePlatform, getRuntimePlatform } from "../util/getRuntimePlatform";
import ExchangeRateProvider from "../db/ExchangeRateProvider";

import get from "axios";

export class ExchangeRate {
  symbol: string;
  rate: number;
  ttl: number;
  constructor({
    symbol,
    rate,
    ttl,
  }: {
    symbol: string;
    rate: number;
    ttl: number;
  }) {
    this.symbol = symbol;
    this.rate = rate;
    this.ttl = ttl;
  }

  toString() {
    this.rate.toFixed(2);
  }

  static async get(symbol: string) {
    const platform = getRuntimePlatform();
    if (platform !== RuntimePlatform.node) {
      return await this.getRateFromIndexedDb(symbol);
    } else {
      return await this.getRateFromGlobalScope(symbol);
    }
  }

  static async getRateFromIndexedDb(symbol): Promise<number> {
    let cache = new ExchangeRateProvider();
    let cacheRate = await cache.getRate(symbol);
    if (cacheRate) {
      // if the cache is still good, return it
      if (cacheRate.ttl > Date.now()) {
        return cacheRate.rate;
      }
      // else fall through
    }
    let freshRate = await getRateFromExchange(symbol);
    cache.setRate(symbol, freshRate, getTtl());
    return freshRate;
  }

  static async getRateFromGlobalScope(symbol) {
    if (globalThis.RATE) {
      let rateObject = globalThis.RATE;
      if (symbol in rateObject) {
        let cachedRate = rateObject[symbol] as ExchangeRate;
        // If the cache is still good return ie
        if (cachedRate.ttl > Date.now()) {
          return cachedRate.rate;
        }
      }
    }
    let freshRate = getRateFromExchange(symbol);
    this.cacheRateInGlobalScope(symbol, freshRate);
    return freshRate;
  }

  static cacheRateInGlobalScope(symbol, rate) {
    if (!globalThis.RATE) {
      globalThis.RATE = {};
    } else {
      globalThis.RATE[symbol] = {
        symbol: symbol,
        rate: rate,
        ttl: getTtl(),
      };
    }
  }
}

export function getTtl() {
  return Math.trunc(Date.now() + EXCHANGE_RATE_TTL);
}

// Attempt to get the usd rate from some web app
export async function getRateFromExchange(symbol: string): Promise<number> {
  if (symbol.length > 0) {
    symbol = symbol.toLocaleLowerCase();
  }
  switch (symbol) {
    case "usd":
      try {
        let response = await get(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd"
        );
        return response.data["bitcoin-cash"].usd;
      } catch (e1) {
        try {
          let response = await get(
            "https://markets.api.bitcoin.com/live/bitcoin"
          );
          return response.data["data"]["BCH"];
        } catch (e2) {
          return e2;
        }
      }
    default:
      throw Error(
        "Support for giving an amount in '${symbol}' is not supported."
      );
  }
}
