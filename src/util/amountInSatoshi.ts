import { bchParam } from "../chain";
import { UnitEnum } from "../wallet/enum";
import { getUsdRate } from "./getUsdRate";

export async function amountInSatoshi(
  value: number,
  rawUnit: any
): Promise<BigInt | Error> {
  const unit = rawUnit.toLocaleLowerCase() as UnitEnum;
  switch (unit) {
    case UnitEnum.BCH:
      return BigInt(value * bchParam.subUnits);
    case UnitEnum.SATOSHI:
      return BigInt(value);
    case UnitEnum.SAT:
      return BigInt(value);
    case UnitEnum.SATS:
      return BigInt(value);
    case UnitEnum.SATOSHIS:
      return BigInt(value);
    case UnitEnum.USD:
      let USD_over_BCH = await getUsdRate();
      let SAT_over_BCH = bchParam.subUnits;

      return BigInt(Number(value * (SAT_over_BCH / USD_over_BCH)).toFixed(0));
    default:
      throw Error("Unit of value not defined");
  }
}
