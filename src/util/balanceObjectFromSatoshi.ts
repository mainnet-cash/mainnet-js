import { bchParam } from "../chain";
import { getUsdRate } from "./getUsdRate";

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
  for (let a of ["bch", "sat", "usd"]) {
    switch (a) {
      case "bch":
        response.bch = value / bchParam.subUnits;
        break;
      case "sat":
        response.sat = value;
        break;
      case "usd":
        response.usd = (value / bchParam.subUnits) * (await getUsdRate());
        break;
      default:
        throw Error("Balance response not understood");
    }
  }
  return response;
}
