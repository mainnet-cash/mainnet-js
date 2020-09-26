import { AmountType } from "../wallet/model";
import { bchParam } from "../chain"
import { UnitEnum } from "../wallet/enum"

export function amountInSatoshi(amount: AmountType): BigInt | Error {
    switch (amount.unit) {
      case UnitEnum.Satoshi:
        return BigInt(amount.value);
      case UnitEnum.Sat:
        return BigInt(amount.value);
      case UnitEnum.Sats:
        return BigInt(amount.value);
      case UnitEnum.Satoshis:
        return BigInt(amount.value);
      case UnitEnum.Bch:
        return BigInt(amount.value * bchParam.subUnits);
      default:
        throw Error("Unit of value not defined");
    }
  }