import { bchParam } from "../chain";
import { getUsdRate } from "./getUsdRate";
import { UnitEnum } from "../enum";

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
  value: number
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
        response.usd = (value / bchParam.subUnits) * (await getUsdRate());
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
  unit?: UnitEnum
): Promise<number> {
  let response: number;
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
      return (value / bchParam.subUnits) * (await getUsdRate());
    default:
      throw Error(
        `Balance response type ${JSON.stringify(unit)} not understood`
      );
  }
}
