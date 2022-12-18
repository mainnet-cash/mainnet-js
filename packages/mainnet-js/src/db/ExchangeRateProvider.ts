import Dexie from "dexie";
import { ExchangeRateI } from "./interface.js";

export default class ExchangeRateProvider extends Dexie {
  private fx: Dexie.Table<ExchangeRateI, number>;

  public constructor() {
    super("exchange-rate");
    this.version(3).stores({
      rate: "symbol",
    });
    this.fx = this.table("rate");
  }

  public async init() {
    return this;
  }

  public async close() {
    return this;
  }

  public getInfo() {
    return "indexedDB";
  }

  /*
   *   Exchange Rate functions
   */

  public async getRate(symbol: string): Promise<ExchangeRateI | undefined> {
    let obj = await this.fx.get({ symbol: symbol });
    if (obj) {
      return obj;
    } else {
      return;
    }
  }

  public async setRate(
    symbol: string,
    rate: number,
    ttl: number
  ): Promise<boolean> {
    return this.transaction("rw", this.fx, async () => {
      // Add or replace the existing entry
      await this.fx.put({ symbol: symbol, rate: rate, ttl: ttl }).catch((e) => {
        throw Error(e);
      });
      return true;
    });
  }
}
