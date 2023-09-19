import { EXCHANGE_RATE_TTL } from "../constant.js";
import {
  RuntimePlatform,
  getRuntimePlatform,
} from "../util/getRuntimePlatform.js";
import ExchangeRateProvider from "../db/ExchangeRateProvider.js";

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

  static async get(symbol: string, useCache = true) {
    const platform = getRuntimePlatform();
    if (platform === RuntimePlatform.browser) {
      try {
        return await this.getRateFromLocalStorage(symbol, useCache);
      } catch {
        return await this.getRateFromGlobalScope(symbol, useCache);
      }
    } else {
      return await this.getRateFromGlobalScope(symbol, useCache);
    }
  }

  static async getRateFromLocalStorage(
    symbol,
    useCache = true
  ): Promise<number> {
    if (!useCache) {
      return await getRateFromExchange(symbol);
    }

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

  static async getRateFromGlobalScope(symbol, useCache = true) {
    if (!useCache) {
      return await getRateFromExchange(symbol);
    }

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
    let freshRate = await getRateFromExchange(symbol);
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
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd"
        );
        const data = await response.json();
        return data["bitcoin-cash"].usd;
      } catch (e1) {
        try {
          const response = await fetch(
            "https://markets.api.bitcoin.com/live/bitcoin"
          );
          const data = await response.json();
          return data["data"]["BCH"];
        } catch (e2: any) {
          return e2;
        }
      }
    default:
      throw Error(
        "Support for giving an amount in '${symbol}' is not supported."
      );
  }
}

await ExchangeRate.get("usd");
