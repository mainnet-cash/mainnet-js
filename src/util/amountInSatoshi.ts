import { bchParam } from "../chain";
import { UnitEnum } from "../enum";
import { getUsdRate } from "./getUsdRate";

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
  const unit = rawUnit.toLocaleLowerCase() as UnitEnum;
  switch (unit) {
    case UnitEnum.BCH:
      return value * bchParam.subUnits;
    case UnitEnum.SATOSHI:
      return value;
    case UnitEnum.SAT:
      return value;
    case UnitEnum.SATS:
      return value;
    case UnitEnum.SATOSHIS:
      return value;
    case UnitEnum.USD:
      let USD_over_BCH = await getUsdRate();
      let SAT_over_BCH = bchParam.subUnits;
      return Math.round(Number(value * (SAT_over_BCH / USD_over_BCH)));
    default:
      throw Error("Unit of value not defined");
  }
}
