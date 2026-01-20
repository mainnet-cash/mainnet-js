import { bchParam } from "../chain.js";
import { UnitEnum } from "../enum.js";
import { floor } from "./floor.js";
import { ExchangeRate } from "../rate/ExchangeRate.js";
import { sanitizeUnit } from "./sanitizeUnit.js";
import { Config } from "../config.js";

export interface BalanceResponse {
  bch: number;
  sat: bigint;
  [currency: string]: any; // number for other currencies
}

export async function balanceResponseFromSatoshi(
  value: bigint,
  priceCache: boolean = true
): Promise<BalanceResponse> {
  const response = {} as BalanceResponse;

  response.bch = Number(value) / Number(bchParam.subUnits);
  response.sat = value;
  const currencyValue =
    (Number(value) / Number(bchParam.subUnits)) *
    (await ExchangeRate.get(Config.DefaultCurrency, priceCache));
  response[Config.DefaultCurrency] = floor(currencyValue, 2);
  return response;
}

export async function balanceFromSatoshi<T extends UnitEnum>(
  value: bigint,
  rawUnit: T,
  priceCache: boolean = true
): Promise<T extends "sat" ? bigint : number> {
  const unit = sanitizeUnit(rawUnit);
  if (unit === UnitEnum.SAT) {
    return value as T extends "sat" ? bigint : never;
  }
  if (unit === UnitEnum.BCH) {
    return (Number(value) / Number(bchParam.subUnits)) as T extends "sat"
      ? never
      : number;
  }
  const currencyValue =
    (Number(value) / Number(bchParam.subUnits)) *
    (await ExchangeRate.get(Config.DefaultCurrency, priceCache));
  return Number(currencyValue.toFixed(2)) as T extends "sat" ? never : number;
}
