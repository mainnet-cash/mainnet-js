import { Service } from "../generated/serve/services/Service";
import { walletFromIdString } from "../src/wallet/createWallet";

/**
 * Send some amount to a given address
 *
 * sendRequest List place a send request
 * returns SendResponse
 * */
export const balance = (request) =>
  new Promise(async (resolve, reject) => {
    const sendRequestJson = request.body;
    try {
      let wallet = await walletFromIdString(sendRequestJson.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }

      let resp = await wallet.getBalance(sendRequestJson.unit);
      if (typeof resp === "number") {
        resolve(Service.successResponse(resp.toString()));
      } else {
        resolve(Service.successResponse(resp));
      }
    } catch (e) {
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });
