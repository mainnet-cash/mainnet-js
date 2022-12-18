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
            // ['OP_RETURN', Buffer.new('MEMO\x10')],
            resp.push(OpReturnData.from(r[1] as string | Buffer));
          } else if (r[0] === "OP_RETURNB64") {
            resp.push(
              OpReturnData.fromBuffer(Buffer.from(base64ToBin(r[1] as string)))
            );
          } else {
            // ['cashaddr', 120, 'sats'],
            resp.push(
              new SendRequest({
                cashaddr: r[0] as string,
                value: r[1] as number,
                unit: r[2] as UnitEnum,
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
  if (object.hasOwnProperty("unit")) {
    return new SendRequest(object as SendRequest);
  } else if (object.hasOwnProperty("tokenId")) {
    return new TokenSendRequest(object as TokenSendRequest);
  } else if (object.hasOwnProperty("buffer")) {
    return OpReturnData.fromBuffer((object as OpReturnData).buffer);
  }
  // endcoding in REST
  else if (object.hasOwnProperty("dataString")) {
    return OpReturnData.fromString((object as any).dataString);
  } else if (object.hasOwnProperty("dataBuffer")) {
    return OpReturnData.fromBuffer(
      Buffer.from(base64ToBin((object as any).dataBuffer))
    );
  }

  throw new Error("Unsupported send object");
}
