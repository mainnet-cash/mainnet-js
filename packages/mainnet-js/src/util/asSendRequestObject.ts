import { base64ToBin } from "@bitauth/libauth";
import { UnitEnum } from "../enum.js";
import {
  OpReturnData,
  SendRequest,
  SendRequestArray,
  TokenSendRequest,
} from "../wallet/model.js";

export function asSendRequestObject(
  requests:
    | SendRequest
    | TokenSendRequest
    | OpReturnData
    | Array<SendRequest | TokenSendRequest | OpReturnData>
    | Array<SendRequestArray>
): Array<SendRequest | TokenSendRequest | OpReturnData> {
  let resp: Array<SendRequest | TokenSendRequest | OpReturnData> = [];
  if (Array.isArray(requests)) {
    requests.forEach(
      (r: SendRequest | TokenSendRequest | OpReturnData | SendRequestArray) => {
        // the SendRequestArray[] case
        if (Array.isArray(r)) {
          if (r[0] === "OP_RETURN") {
            // ['OP_RETURN', utf8ToBin('MEMO\x10')],
            resp.push(OpReturnData.from(r[1] as string | Uint8Array));
          } else if (r[0] === "OP_RETURNB64") {
            resp.push(
              OpReturnData.fromUint8Array(
                Uint8Array.from(base64ToBin(r[1] as string))
              )
            );
          } else {
            // ['cashaddr', 120] or ['cashaddr', 120n],
            resp.push(
              new SendRequest({
                cashaddr: r[0] as string,
                value:
                  typeof r[1] === "number"
                    ? BigInt(Math.floor[1])
                    : (r[1] as bigint),
              })
            );
          }
        } else {
          // SendRequest | TokenSendRequest | OpReturnRequest case
          resp.push(convertToClass(r));
        }
      }
    );
  } else {
    // the SendRequest | OpReturnData object case
    resp.push(
      convertToClass(requests as SendRequest | TokenSendRequest | OpReturnData)
    );
  }
  return resp;
}

function convertToClass(object: SendRequest | TokenSendRequest | OpReturnData) {
  if (object.hasOwnProperty("tokenId")) {
    return new TokenSendRequest(object as TokenSendRequest);
  } else if (object.hasOwnProperty("buffer")) {
    return OpReturnData.fromUint8Array((object as OpReturnData).buffer);
  }
  // endcoding in REST
  else if (object.hasOwnProperty("dataString")) {
    return OpReturnData.fromString((object as any).dataString);
  } else if (object.hasOwnProperty("dataBuffer")) {
    return OpReturnData.fromUint8Array(
      Uint8Array.from(base64ToBin((object as any).dataBuffer))
    );
  } else if (
    object.hasOwnProperty("cashaddr") &&
    object.hasOwnProperty("value") &&
    object.hasOwnProperty("tokenId") === false
  ) {
    return new SendRequest(object as SendRequest);
  }

  throw new Error("Unsupported send object");
}
