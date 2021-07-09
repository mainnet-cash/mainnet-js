import { EXCHANGE_RATE_TTL } from "../constant";
import {
  RuntimePlatform,
  getRuntimePlatform,
} from "../util/getRuntimePlatform";
import ExchangeRateProvider from "../db/ExchangeRateProvider";
import { indexedDbIsAvailable } from "../db/util";

const axios = require("axios").default;

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

  static setupAxiosMock(mockUrl, responseData) {
    if (!axios.interceptors.mocks) {
      axios.interceptors.mocks = {};

      // install our interceptors
      axios.interceptors.request.use((config) => {
        const url = config.url!;

        if (axios.interceptors.mocks[url]) {
          // if we have set up a mocked response for this url, cancel the actual request with a cancelToken containing our mocked data
          const mockedResponse = axios.interceptors.mocks[url];
          return {
            ...config,
            cancelToken: new axios.CancelToken((cancel) =>
              cancel({ status: 200, data: mockedResponse })
            ),
          };
        }

        // otherwise proceed with usual request
        return config;
      });

      axios.interceptors.response.use(
        function (response) {
          return response;
        },
        function (error) {
          // resolve response with our mocked data
          if (axios.isCancel(error)) {
            return Promise.resolve(error.message);
          }

          // handle all other errors gracefully
          return Promise.reject(error);
        }
      );
    }

    axios.interceptors.mocks[mockUrl] = responseData;
  }

  toString() {
    this.rate.toFixed(2);
  }

  static async get(symbol: string) {
    const platform = getRuntimePlatform();
    if (platform !== RuntimePlatform.node && indexedDbIsAvailable()) {
      try {
        return await this.getRateFromIndexedDb(symbol);
      } catch {
        return await this.getRateFromGlobalScope(symbol);
      }
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
    default:
      throw Error(
        "Support for giving an amount in '${symbol}' is not supported."
      );
  }
}

ExchangeRate.get("usd");
