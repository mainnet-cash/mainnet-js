import {
  OpReturnData,
  SendRequest,
  TokenSendRequest,
} from "../wallet/model.js";

// This function sums a list of send request objects
export async function sumSendRequestAmounts(
  requests: Array<SendRequest | TokenSendRequest | OpReturnData>
) {
  if (requests) {
    const balanceArray: (BigInt | Error)[] = await Promise.all(
      requests.map(async (r: SendRequest | TokenSendRequest | OpReturnData) => {
        if (r instanceof SendRequest) {
          return r.value;
        } else if (r instanceof TokenSendRequest) {
          return r.value || 1000n;
        } else return 0n;
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
