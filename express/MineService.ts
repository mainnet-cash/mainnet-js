import { Service } from "../generated/serve/services/Service";
import { generateBlocks } from "../src/mine/generateBlocks";

/**
 * walletMethod handle most other api calls on a wallet
 *
 * takes a walletId and some other arguments
 * */
export const mine = (request: any, method): Promise<any> =>
  new Promise(async (resolve, reject) => {
    try {
      let args = request.body;
      let resp = await generateBlocks(args);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(e);
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });
