import { SendRequest } from "../wallet/Base";
export async function sumSendRequestAmounts(requests: SendRequest[]) {
  if (requests) {
    const balanceArray: (number | Error)[] = await Promise.all(
      requests.map(async (r:SendRequest) => {
        return r.amount.inSatoshi();
      })
    );
    const balance = balanceArray.reduce(sumBalance, 0);
    return balance;
  } else {
    return 0;
  }
}

function sumBalance(a: number, b: number | Error) {
  // a is zero or a number
  if (b instanceof Error) {
    throw b;
  }
  return a + b;
}
