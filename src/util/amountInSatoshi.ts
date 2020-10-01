import { bchParam } from "../chain";
import { UnitEnum } from "../wallet/enum";

export function amountInSatoshi(value: number, unit: UnitEnum): BigInt | Error {
  switch (unit) {
    case UnitEnum.Satoshi:
      return BigInt(value);
    case UnitEnum.Sat:
      return BigInt(value);
    case UnitEnum.Sats:
      return BigInt(value);
    case UnitEnum.Satoshis:
      return BigInt(value);
    case UnitEnum.Bch:
      return BigInt(value * bchParam.subUnits);
    default:
      throw Error("Unit of value not defined");
  }
}
