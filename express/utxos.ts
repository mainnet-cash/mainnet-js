import { Service } from "../generated/serve/services/Service";
import { walletFromIdString } from "../src/wallet/createWallet";

/**
 * Get detailed information about unspent outputs (utxos)
 *
 * serializedWallet SerializedWallet Request detailed list of unspent transaction outputs
 * returns UtxoResponse
 * */
export const utxos = (request) =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await walletFromIdString(request.body.walletId);
      let resp = await wallet.utxos();
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(JSON.stringify(e));
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });
