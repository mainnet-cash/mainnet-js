import {
  OpReturnData,
  SendRequest,
  TokenSendRequest,
} from "../wallet/model.js";
import { amountInSatoshi } from "./amountInSatoshi.js";

// This function sums a list of send request objects
export async function sumSendRequestAmounts(
  requests: Array<SendRequest | TokenSendRequest | OpReturnData>
) {
  if (requests) {
    const balanceArray: (BigInt | Error)[] = await Promise.all(
      requests.map(async (r: SendRequest | TokenSendRequest | OpReturnData) => {
        if (r instanceof SendRequest) {
          return BigInt(await amountInSatoshi(r.value, r.unit));
        } else if (r instanceof TokenSendRequest) {
          return BigInt(r.value || 1000);
        } else return BigInt(0);
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
  return BigInt(a as bigint) + BigInt(b as bigint);
}
