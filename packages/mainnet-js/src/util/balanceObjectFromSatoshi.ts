import { bchParam } from "../chain.js";
import { UnitEnum } from "../enum.js";
import { floor } from "./floor.js";
import { ExchangeRate } from "../rate/ExchangeRate.js";
import { sanitizeUnit } from "./sanitizeUnit.js";

export class BalanceResponse {
  bch?: number;
  sat?: number;
  usd?: number;
  constructor(bch?: number, sat?: number, usd?: number) {
    this.bch = bch;
    this.sat = sat;
    this.usd = usd;
  }
}

export async function balanceResponseFromSatoshi(
  value: number,
  usdPriceCache: boolean = true
): Promise<BalanceResponse> {
  let response = new BalanceResponse();
  let returnUnits: UnitEnum[] = ["bch", "sat", "usd"];

  for (const u of returnUnits) {
    switch (u) {
      case UnitEnum.BCH:
        response.bch = value / bchParam.subUnits;
        break;
      case UnitEnum.SAT:
        response.sat = value;
        break;
      case UnitEnum.USD:
        let usd =
          (value / bchParam.subUnits) *
          (await ExchangeRate.get("usd", usdPriceCache));
        response.usd = floor(usd, 2);
        break;
      default:
        throw Error(
          `Balance response type ${JSON.stringify(u)} not understood`
        );
    }
  }
  return response;
}

export async function balanceFromSatoshi(
  value: number,
  rawUnit: string,
  usdPriceCache: boolean = true
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
    case UnitEnum.USD:
      let usd =
        (value / bchParam.subUnits) *
        (await ExchangeRate.get("usd", usdPriceCache));
      return Number(usd.toFixed(2));
    default:
      throw Error(
        `Balance response type ${JSON.stringify(unit)} not understood`
      );
  }
}
