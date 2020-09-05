import { Service } from "../generated/serve/services/Service";
import { SerializedWallet } from "../generated/client/typescript-mock/model/serializedWallet";
import { ScalableNetworkGraphic } from "../generated/client/typescript-mock/model/scalableNetworkGraphic";
import { qrAddress } from "../src/qr/Qr"
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
      let body = request.body;
      let wallet = await walletFromIdString(body.walletId);
      if (wallet) {
        let resp = new ScalableNetworkGraphic();
        resp.src = qrAddress(wallet.cashaddr)
        resolve(Service.successResponse({ ...resp }));
      }
    } catch (e) {
      console.log(JSON.stringify(e));
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });
