import { SendRequest } from "../wallet/model";
import { amountInSatoshi } from "./amountInSatoshi";
export async function sumSendRequestAmounts(requests: SendRequest[]) {
  if (requests) {
    const balanceArray: (BigInt | Error)[] = await Promise.all(
      requests.map(async (r: SendRequest) => {
        return amountInSatoshi(r.value, r.unit);
      })
    );
    const balance = balanceArray.reduce(sumBalance, 0n);
    return balance;
  } else {
    return 0n;
  }
}

function sumBalance(a: BigInt, b: BigInt | Error) {
  // a is zero or a number
  if (b instanceof Error) {
    throw b;
  }
  return BigInt(a) + BigInt(b);
}
