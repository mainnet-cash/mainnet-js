import { bchParam } from "../chain";
import { UnitEnum } from "../wallet/enum";

export function amountInSatoshi(value: number, unit: UnitEnum): BigInt | Error {
  switch (unit) {
    case UnitEnum.SATOSHI:
      return BigInt(value);
    case UnitEnum.SAT:
      return BigInt(value);
    case UnitEnum.SATS:
      return BigInt(value);
    case UnitEnum.SATOSHIS:
      return BigInt(value);
    case UnitEnum.BCH:
      return BigInt(value * bchParam.subUnits);
    default:
      throw Error("Unit of value not defined");
  }
}
