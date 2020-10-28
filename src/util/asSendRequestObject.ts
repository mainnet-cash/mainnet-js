import { SendRequest, SendRequestArray } from "../wallet/model";

export function asSendRequestObject(
  requests: Array<SendRequest> | Array<SendRequestArray>
): SendRequest[] {
  let resp: SendRequest[] = [];
  requests.forEach(async (r: SendRequest | SendRequestArray) => {
    if (r.hasOwnProperty("cashaddr")) {
      resp.push(new SendRequest(r as SendRequest));
    } else {
      resp.push(
        new SendRequest({
          cashaddr: r[0],
          value: r[1],
          unit: r[2],
        })
      );
    }
  });
  return resp;
}
