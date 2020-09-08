import { Service } from "../generated/serve/services/Service";
import { createWallet as createWalletFn } from "../src/wallet/createWallet";
import { WalletRequest } from "../generated/client/typescript-mock/model/walletRequest";
import { WalletResponse } from "../generated/client/typescript-mock/model/walletResponse";

/**
 * create a new wallet
 *
 * body WalletRequest Request a new new random wallet
 * returns WalletResponse
 * */
export const createWallet = (request) =>
  new Promise(async (resolve, reject) => {
    try {
      let resp = new WalletResponse();
      resp = await createWalletFn(request.body);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(JSON.stringify(e));
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });
