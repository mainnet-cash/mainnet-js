import { SendRequest, SendRequestArray } from "../wallet/model";

export function asSendRequestObject(
  requests: SendRequest | Array<SendRequest> | Array<SendRequestArray>
): SendRequest[] {
  let resp: SendRequest[] = [];
  if(Array.isArray(requests)){
    requests.forEach(async (r: SendRequest | SendRequestArray) => {
      // the SendRequest[] case
      if (r.hasOwnProperty("cashaddr")) {
        resp.push(r as SendRequest);
      } 
      // the SendRequestArray[] case
      else {
        resp.push(
          new SendRequest({
            cashaddr: r[0],
            value: r[1],
            unit: r[2],
          })
        );
      }
    });  
  }else{
    // the SendRequest object case
    resp.push(requests as SendRequest);
  }
  return resp;
}
