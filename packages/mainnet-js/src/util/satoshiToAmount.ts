import { bchParam } from "../chain.js";
import { UnitEnum } from "../enum.js";
import { ExchangeRate } from "../rate/ExchangeRate.js";
import { sanitizeUnit } from "../util/sanitizeUnit.js";

/**
 * converts given value and unit from satoshi
 *
 * @param {value} number           some value in satoshi
 * @param {rawUnit} any            the target unit
 *
 * @returns a promise to the value in the unit of account given by rawUnit
 */
export async function satoshiToAmount(
  value: number,
  rawUnit: any
): Promise<number> {
  const unit = sanitizeUnit(rawUnit);
  switch (unit) {
    case UnitEnum.BCH:
      return value / bchParam.subUnits;
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
      // truncate dollar amounts to fixed precision (2),
      // then return the fixed value string as a float.
      let dollarValue = Number(value * (USD_over_BCH / SAT_over_BCH)).toFixed(
        2
      );
      return Number.parseFloat(dollarValue);
    default:
      throw Error("Unit of value not defined");
  }
}
