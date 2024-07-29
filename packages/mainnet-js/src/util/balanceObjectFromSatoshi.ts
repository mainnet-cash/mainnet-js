import { bchParam } from "../chain.js";
import { UnitEnum } from "../enum.js";
import { floor } from "./floor.js";
import { ExchangeRate } from "../rate/ExchangeRate.js";
import { sanitizeUnit } from "./sanitizeUnit.js";
import { Config } from "../config.js";

export interface BalanceResponse {
  bch: number;
  sat: number;
  [currency: string]: number;
}

export async function balanceResponseFromSatoshi(
  value: number,
  priceCache: boolean = true
): Promise<BalanceResponse> {
  const response = {} as BalanceResponse;

  response.bch = value / bchParam.subUnits;
  response.sat = value;
  const currencyValue =
    (value / bchParam.subUnits) *
    (await ExchangeRate.get(Config.DefaultCurrency, priceCache));
  response[Config.DefaultCurrency] = floor(currencyValue, 2);
  return response;
}

export async function balanceFromSatoshi(
  value: number,
  rawUnit: string,
  priceCache: boolean = true
): Promise<number> {
  const unit = sanitizeUnit(rawUnit);
  switch (unit) {
    case UnitEnum.BCH:
      return value / bchParam.subUnits;
    case UnitEnum.SAT:
      return value;
    case UnitEnum.SATS:
      return value;
    case UnitEnum.SATOSHI:
      return value;
    case UnitEnum.SATOSHIS:
      return value;
    default:
      const currencyValue =
        (value / bchParam.subUnits) *
        (await ExchangeRate.get(Config.DefaultCurrency, priceCache));
      return Number(currencyValue.toFixed(2));
  }
}
