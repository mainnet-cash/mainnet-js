import { Service } from "../generated/serve/services/Service";
import { SendResponse } from "../generated/client/typescript-mock/model/sendResponse";
import { walletFromIdString } from "../src/util/walletFromIdString";
import { balanceResponseFromSatoshi } from "../src/util/balanceObjectFromSatoshi";
import { binToHex } from "@bitauth/libauth";
import { SendMaxRequest } from "../src/wallet/Base";

/**
 * Send all available funds to a given address
 *
 * sendMaxRequest SendMaxRequest Request to all available funds to a given address
 * returns SendMaxResponse
 * */
export const sendMax = (request) =>
  new Promise(async (resolve, reject) => {
    const sendRequestJson = request.body;

    try {
      let wallet = await walletFromIdString(sendRequestJson.walletId);
      if (wallet) {
        let cashaddr = sendRequestJson.cashaddr as string;
        let sendRequest = new SendMaxRequest({ cashaddr: cashaddr });
        let result = await wallet.sendMax(sendRequest);
        let resp = new SendResponse();
        resp.transaction = binToHex(result);

        resp.balance = balanceResponseFromSatoshi(
          await wallet.getBalance(wallet.cashaddr as string)
        );
        resolve(Service.successResponse(resp));
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
