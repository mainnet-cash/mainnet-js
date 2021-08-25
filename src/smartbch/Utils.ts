import { UnitEnum } from "../enum";
import { SendRequest, SendRequestArray } from "./interface";

export function zeroAddress() {
  return "0x0000000000000000000000000000000000000000";
}

export function asSendRequestObject(requests: SendRequest | SendRequest[] | SendRequestArray[]) {
  let resp: Array<SendRequest> = [];
  if (Array.isArray(requests)) {
    requests.forEach((r: SendRequest | SendRequestArray) => {
      // the SendRequestArray[] case
      if (Array.isArray(r)) {
        // ['address', 120, 'sats'],
        resp.push(
          {
            address: r[0] as string,
            value: r[1] as number,
            unit: r[2] as UnitEnum,
          }
        );
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
