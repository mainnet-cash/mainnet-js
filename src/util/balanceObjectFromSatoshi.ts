import { bch as bchPrarams } from "../chain";

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

export function balanceResponseFromSatoshi(value: number): BalanceResponse {
  let response = new BalanceResponse();
  for (let a of ["bch", "sat", "usd"]) {
    switch (a) {
      case "bch":
        response.bch = value / bchPrarams.subUnits;
        break;
      case "sat":
        response.sat = value;
        break;
      case "usd":
        // TODO implement
        response.usd = 0;
        break;
      default:
        throw Error("Balance response not understood");
    }
  }
  return response;
}
