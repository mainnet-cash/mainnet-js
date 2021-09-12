import { ethers } from "ethers";
import { UnitEnum } from "mainnet-js";
import { SendRequest, SendRequestArray } from "./interface";

export function zeroAddress() {
  return "0x0000000000000000000000000000000000000000";
}

export function satToWei(value: number): ethers.BigNumber {
  return ethers.BigNumber.from(value).mul(ethers.BigNumber.from(10 ** 10));
}

export function weiToSat(value: ethers.BigNumberish): number {
  return ethers.BigNumber.from(value)
    .div(ethers.BigNumber.from(10 ** 10))
    .toNumber();
}

export function asSendRequestObject(
  requests: SendRequest | SendRequest[] | SendRequestArray[]
) {
  let resp: Array<SendRequest> = [];
  if (Array.isArray(requests)) {
    requests.forEach((r: SendRequest | SendRequestArray) => {
      // the SendRequestArray[] case
      if (Array.isArray(r)) {
        // ['address', 120, 'sats'],
        resp.push({
          address: r[0] as string,
          value: r[1] as number,
          unit: r[2] as UnitEnum,
        });
      } else {
        // SendRequest case
        resp.push(convertToClass(r));
      }
    });
  } else {
    // the SendRequest object case
    resp.push(convertToClass(requests as SendRequest));
  }
  return resp;
}

export function convertToClass(object: SendRequest) {
  if (object.hasOwnProperty("address")) {
    return object as SendRequest;
  }

  throw new Error("Unsupported send object");
}
