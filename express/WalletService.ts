import { Service } from "../generated/serve/services/Service";
import { walletFromIdString } from "../src/wallet/createWallet";
import { createWalletResponse } from "../src/wallet/createWallet";

export { send } from "./send";
export { sendMax } from "./sendMax";
export { balance } from "./balance";

/**
 * create a new wallet
 *
 * body WalletRequest Request a new new random wallet
 * returns WalletResponse
 * */
export const createWallet = (request) =>
  new Promise(async (resolve, reject) => {
    try {
      let resp = await createWalletResponse(request.body);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(JSON.stringify(e));
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });

/**
 * walletMethod handle most other api calls on a wallet
 *
 * takes a walletId and some other arguments
 * */
const walletMethod = (request: any, method): Promise<any> =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await walletFromIdString(request.body.walletId);
      let args = request.body;
      delete args.walletId;
      let resp = await wallet[method](args);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(e);
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });

//export const balance = (req) => walletMethod(req, "getBalance");
export const depositAddress = (req) => walletMethod(req, "getDepositAddress");
export const depositQr = (req) => walletMethod(req, "getDepositQr");
export const maxAmountToSend = (req) => walletMethod(req, "getMaxAmountToSend");
export const utxos = (req) => walletMethod(req, "getUtxos");
