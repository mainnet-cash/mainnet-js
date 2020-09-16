import { Service } from "../generated/serve/services/Service";
import { walletFromIdString } from "../src/wallet/createWallet";
import { SendMaxRequest } from "../src/wallet/model";

/**
 * Send all available funds to a given address
 *
 * sendMaxRequest SendMaxRequest Request to all available funds to a given address
 * returns SendMaxResponse
 * */
export const sendMax = (request) =>
  new Promise(async (resolve, reject) => {
    const sendRequestJson = request.body;
    console.log(JSON.stringify(sendRequestJson))
    try {
      let wallet = await walletFromIdString(sendRequestJson.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }
      let cashaddr = sendRequestJson.cashaddr as string;
      let sendRequest = new SendMaxRequest({ cashaddr: cashaddr });
      let resp = await wallet.sendMax(sendRequest);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(e)
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });
