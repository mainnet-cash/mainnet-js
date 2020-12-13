import { amountInSatoshi } from "./amountInSatoshi";
import { satoshiToAmount } from "./satoshiToAmount";


/**
   * convert transforms unit of measurement for some monetary value
   *
   * @param {value} number           amount to convert
   * @param {from} any               unit of measurement to convert from
   * @param {to} any                 unit of measurement to convert to
   *
   * @returns a promise to the value in "to" units
   */
export async function convert(
  value: number,
  from: any,
  to: any
): Promise<number> {
  let satoshi = await amountInSatoshi(value, from);
    return satoshiToAmount(satoshi, to);
 
}
