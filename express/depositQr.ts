import { Service } from "../generated/serve/services/Service";
import { SerializedWallet } from "../generated/client/typescript-mock/model/serializedWallet";
import { ScalableVectorGraphic } from "../generated/client/typescript-mock/model/scalableVectorGraphic";
import { walletFromIdString } from "../src/util/walletFromIdString";
/**
 * Get a deposit address in cash address format
 *
 * serializedWallet SerializedWallet Request for a deposit address given a wallet
 * returns DepositAddressResponse
 * */
export const depositQr = (request) =>
  new Promise(async (resolve, reject) => {
    try {
      let body: SerializedWallet = request.body;
      let wallet = await walletFromIdString(body.walletId);
      if (wallet && wallet.cashaddr) {
        let resp = new ScalableVectorGraphic();
        let svg = wallet.depositQr();

        // Buffer doesn't exist in the browser so this logic is moved here.
        let svgB64 = Buffer.from(svg, "utf8").toString("base64");
        resp.src = `data:image/svg+xml;base64,${svgB64}`;
        resolve(Service.successResponse({ ...resp }));
      } else {
        throw Error("Wallet could not be derived");
      }
    } catch (e) {
      console.log(JSON.stringify(e));
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });
