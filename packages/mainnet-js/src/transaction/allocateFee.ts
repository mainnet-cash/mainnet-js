import {
  OpReturnData,
  SendRequest,
  TokenSendRequest,
} from "../wallet/model.js";
import { FeePaidByEnum } from "../wallet/enum.js";
import { DUST_UTXO_THRESHOLD } from "../constant.js";

export function checkFeeForDust(value: number) {
  if (value < DUST_UTXO_THRESHOLD) {
    throw Error("Fee strategy would result in dust output");
  }
}

export function checkSatsAvailable(
  sendRequestArray: Array<SendRequest>,
  fee: number
) {
  let amountAvailable = sendRequestArray.reduce(function (sum, r) {
    return sum + (r.value - DUST_UTXO_THRESHOLD);
  }, 0);
  if (amountAvailable < fee) {
    throw Error("Insufficient funds for transaction given fee");
  }
}

export function checkForNonStandardSendRequest(
  output: SendRequest | TokenSendRequest | OpReturnData
): SendRequest {
  if (output instanceof TokenSendRequest) {
    throw Error("Cannot specify fee to be paid by TokenSendRequest");
  }

  if (output instanceof OpReturnData) {
    throw Error("Cannot specify fee to be paid by OpReturnData");
  }

  return output;
}

export function sortSendRequests(sendRequestArray: Array<SendRequest>) {
  return sendRequestArray.sort(
    (a: SendRequest, b: SendRequest) => a.value - b.value
  );
}

function distributeFees(requests: Array<SendRequest>, fee: number) {
  checkSatsAvailable(requests, fee);
  fee = Number(fee);
  for (let r = 0; r < requests.length; r++) {
    if (fee > 0) {
      checkForNonStandardSendRequest(requests[r]);
      let perRequestFee = Math.floor(fee / (requests.length - r));
      perRequestFee += fee % (requests.length - r);
      if (requests[r].value - perRequestFee < DUST_UTXO_THRESHOLD) {
        fee -= requests[r].value;
        requests[r].value = 0;
      } else {
        fee -= perRequestFee;
        requests[r].value -= perRequestFee;
      }
    }
  }
  return requests.filter((r) => r.value >= DUST_UTXO_THRESHOLD);
}

function firstPays(
  requests: Array<SendRequest | TokenSendRequest | OpReturnData>,
  fee: number
) {
  let payer = requests.shift()!;
  payer = checkForNonStandardSendRequest(payer);
  payer.value = payer.value! - fee;
  checkFeeForDust(payer.value);
  requests.unshift(payer);
  return requests;
}
function lastPays(
  requests: Array<SendRequest | TokenSendRequest | OpReturnData>,
  fee: number
) {
  let payer = requests.pop()!;
  payer = checkForNonStandardSendRequest(payer);
  payer.value = payer.value! - fee;
  checkFeeForDust(payer.value);
  requests.push(payer);
  return requests;
}
function anyPays(
  requests: Array<SendRequest | TokenSendRequest | OpReturnData>,
  fee: number
) {
  for (let r of requests) {
    checkForNonStandardSendRequest(r);
  }
  requests = sortSendRequests(requests as Array<SendRequest>);
  requests = distributeFees(requests as Array<SendRequest>, fee);
  return requests;
}

function changeThenFallback(
  requests: Array<SendRequest | TokenSendRequest | OpReturnData>,
  fee: number,
  change: bigint,
  fallbackFn: Function
) {
  if (BigInt(fee) > change) {
    let outstandingFee = BigInt(fee) - change;
    requests = fallbackFn(requests, outstandingFee);
  }
  return requests;
}

export function allocateFee(
  requests: Array<SendRequest | TokenSendRequest | OpReturnData>,
  fee: number,
  feePaidBy: FeePaidByEnum,
  change: bigint
): Array<SendRequest> {
  if (requests.length > 0) {
    switch (feePaidBy) {
      case FeePaidByEnum.change:
        // handled by default
        break;
      case FeePaidByEnum.changeThenFirst:
        requests = changeThenFallback(requests, fee, change, firstPays);
        break;
      case FeePaidByEnum.changeThenLast:
        requests = changeThenFallback(requests, fee, change, lastPays);
        break;
      case FeePaidByEnum.changeThenAny:
        requests = changeThenFallback(requests, fee, change, anyPays);
        break;
      case FeePaidByEnum.first:
        requests = firstPays(requests, fee);
        break;
      case FeePaidByEnum.last:
        requests = lastPays(requests, fee);
        break;
      case FeePaidByEnum.any:
        requests = anyPays(requests, fee);
        break;
      default:
        throw Error("FeePaidBy option not recognized");
    }
    return requests as Array<SendRequest>;
  } else {
    throw Error("Attempted to specify feePaidBy on zero length SendRequest");
  }
}
