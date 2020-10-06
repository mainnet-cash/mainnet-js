import { Service } from "../generated/serve/services/Service";
import { mine as mineFn } from "../src/mine";

/**
 * walletMethod handle most other api calls on a wallet
 *
 * takes a walletId and some other arguments
 * */
export const mine = (request: any): Promise<any> =>
  new Promise(async (resolve, reject) => {
    try {
      let args = request.body;
      let resp = await mineFn(args);
      resolve(Service.successResponse(resp));
    } catch (e) {
      console.log(e);
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });
