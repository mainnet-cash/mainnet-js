import { bchParam } from "../chain.js";
import { UnitEnum } from "../enum.js";
import { ExchangeRate } from "../rate/ExchangeRate.js";
import { sanitizeUnit } from "../util/sanitizeUnit.js";

/**
 * converts given value and unit into satoshi
 *
 * @param {value} number           some value
 * @param {rawUnit} any            the unit of value
 *
 * @returns a promise to the value in satoshi
 */

export async function amountInSatoshi(
  value: number,
  rawUnit: any
): Promise<number> {
  const unit = sanitizeUnit(rawUnit);
  switch (unit) {
    case UnitEnum.BCH:
      return Math.round(value * bchParam.subUnits);
    case UnitEnum.SATOSHI:
      return value;
    case UnitEnum.SAT:
      return value;
    case UnitEnum.SATS:
      return value;
    case UnitEnum.SATOSHIS:
      return value;
    case UnitEnum.USD:
      let USD_over_BCH = await ExchangeRate.get("usd");
      let SAT_over_BCH = bchParam.subUnits;
      return Math.round(Number(value * (SAT_over_BCH / USD_over_BCH)));
    default:
      throw Error("Unit of value not defined");
  }
}
