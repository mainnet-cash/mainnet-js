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
): Promise<bigint> {
  const unit = sanitizeUnit(rawUnit);
  switch (unit) {
    case UnitEnum.BCH:
      return BigInt(Math.round(value * Number(bchParam.subUnits)));
    case UnitEnum.SAT:
      return BigInt(value);
    default:
      const Currency_over_BCH = await ExchangeRate.get(rawUnit);
      const SAT_over_BCH = bchParam.subUnits;

      return BigInt(
        Math.round(Number(value * (Number(SAT_over_BCH) / Currency_over_BCH)))
      );
  }
}
