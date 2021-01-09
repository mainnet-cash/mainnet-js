import { SendRequest } from "../wallet/model";
import { amountInSatoshi } from "./amountInSatoshi";

// This function sums a list of send request objects
export async function sumSendRequestAmounts(requests: SendRequest[]) {
  if (requests) {
    const balanceArray: (BigInt | Error)[] = await Promise.all(
      requests.map(async (r: SendRequest) => {
        return BigInt(await amountInSatoshi(r.value, r.unit));
      })
    );
    const balance = balanceArray.reduce(sumBalance, BigInt(0));
    return balance;
  } else {
    return BigInt(0);
  }
}

function sumBalance(a: BigInt, b: BigInt | Error) {
  // a is zero or a number
  if (b instanceof Error) {
    throw b;
  }
  return BigInt(a) + BigInt(b);
}
