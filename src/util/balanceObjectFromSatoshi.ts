import {bch} from "../chain"
export class BalanceResponse {
  bch?: number;
  sat?: number;
}
export function balanceResponseFromSatoshi(value: number): BalanceResponse {
  let response = new BalanceResponse();
  for (let a of ["bch", "sat"]) {
    switch (a) {
      case "bch":
        response.bch = value / bch.subUnits;
        break;
      case "sat":
        response.sat = value;
        break;
      case "usd":
        // currently no exchange
        break;
      default:
        throw Error("Balance response not understood");
    }
  }
  return response;
}
