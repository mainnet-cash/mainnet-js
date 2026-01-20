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
  value: bigint,
  rawUnit: any
): Promise<number> {
  const unit = sanitizeUnit(rawUnit);
  switch (unit) {
    case UnitEnum.BCH:
      return Number(value) / Number(bchParam.subUnits);
    case UnitEnum.SAT:
      return Number(value);
    default:
      const Currency_over_BCH = await ExchangeRate.get(rawUnit);
      // truncate currency amounts to fixed precision (2),
      // then return the fixed value string as a float.
      const currencyValue = Number(
        Number(value) * (Currency_over_BCH / Number(bchParam.subUnits))
      ).toFixed(2);
      return Number.parseFloat(currencyValue);
  }
}
