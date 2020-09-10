import { Service } from "../generated/serve/services/Service";
import { walletFromIdString } from "../src/wallet/createWallet";

/**
 * Send some amount to a given address
 *
 * sendRequest List place a send request
 * returns SendResponse
 * */
export const send = (request) =>
  new Promise(async (resolve, reject) => {
    const sendRequestJson = request.body;
    try {
      let wallet = await walletFromIdString(sendRequestJson.walletId);
      if (wallet) {
        let result = await wallet.send(sendRequestJson.to);
        resolve(Service.successResponse(result));
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
