import { UnitEnum } from "../enum";
import { OpReturnData, SendRequest, SendRequestArray } from "../wallet/model";

export function asSendRequestObject(
  requests:
    | SendRequest
    | OpReturnData
    | Array<SendRequest | OpReturnData>
    | Array<SendRequestArray>
): Array<SendRequest | OpReturnData> {
  let resp: Array<SendRequest | OpReturnData> = [];
  if (Array.isArray(requests)) {
    requests.forEach((r: SendRequest | OpReturnData | SendRequestArray) => {
      // the SendRequestArray[] case
      if (Array.isArray(r)) {
        if (r[0] === 'OP_RETURN') {
          // ['OP_RETURN', Buffer.new('MEMO\x10')],
          resp.push(
            OpReturnData.from(r[1] as string | Buffer)
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
        // SendRequest | OpReturnRequest case
        resp.push(convertToClass(r));
      }
    });
  } else {
    // the SendRequest | OpReturnData object case
    resp.push(convertToClass(requests as SendRequest | OpReturnData));
  }
  return resp;
}

function convertToClass(object: SendRequest | OpReturnData) {
  if (object.hasOwnProperty("cashaddr")) {
    return new SendRequest(object as SendRequest);
  } else if (object.hasOwnProperty("buffer")) {
    return OpReturnData.fromBuffer((object as OpReturnData).buffer);
  }

  throw new Error("Unsupported send object");
}
