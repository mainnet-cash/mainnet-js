import { Service } from "../generated/serve/services/Service";
import { walletFromIdString } from "../src/wallet/createWallet";
import { BalanceResponse } from "../generated/client/typescript-mock/model/balanceResponse";

/**
 * Get total balance for wallet
 *
 * serializedWallet SerializedWallet Request for a wallet balance
 * returns BalanceResponse
 * */
export const balance = (request) =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await walletFromIdString(request.body.walletId);
      if (wallet) {
        let resp = new BalanceResponse();
        resp = await wallet.balance();
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
