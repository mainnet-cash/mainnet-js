import { Service } from "../generated/serve/services/Service";
import { SendResponse } from "../generated/client/typescript-mock/model/sendResponse";
import { walletFromIdString } from "../src/util/walletFromIdString";
import { balanceResponseFromSatoshi } from "../src/util/balanceObjectFromSatoshi";
import { binToHex } from "@bitauth/libauth";
/**
 * Send some amount to a given address
 *
 * sendRequest List place a send request
 * returns SendResponse
 * */
export const send = (request) =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await walletFromIdString(request.body.walletId);
      if (wallet) {
        let result = await wallet.send(request.body.to);
        let resp = new SendResponse();
        resp.transaction = result.map((t) => {
          return binToHex(t);
        })[0];
        resp.balance = balanceResponseFromSatoshi(
          await wallet.getBalance(wallet.cashaddr as string)
        );
        resolve(Service.successResponse({ ...resp }));
      } else {
        throw Error("Could not derive wallet");
      }
    } catch (e) {
      console.log(JSON.stringify(e));
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });
