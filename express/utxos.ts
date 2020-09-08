import { binToHex } from "@bitauth/libauth";

import { Service } from "../generated/serve/services/Service";
import { walletFromIdString } from "../src/wallet/createWallet";
import { UtxoResponse } from "../generated/client/typescript-mock/model/utxoResponse";
import { Utxo } from "../generated/client/typescript-mock/model/utxo";
import { UnitEnum } from "../src/wallet/Base";
import { UnspentOutput } from "grpc-bchrpc-node/pb/bchrpc_pb";
import { Amount } from "../generated/client/typescript-mock/model/amount";

/**
 * Get detailed information about unspent outputs (utxos)
 *
 * serializedWallet SerializedWallet Request detailed list of unspent transaction outputs
 * returns UtxoResponse
 * */
export const utxos = (request) =>
  new Promise(async (resolve, reject) => {
    try {
      let sendParam = request.body;
      let wallet = await walletFromIdString(sendParam.walletId);

      if (wallet.cashaddr) {
        let result = await wallet.utxos();
        resolve(Service.successResponse({ ...result }));
      }
    } catch (e) {
      console.log(JSON.stringify(e));
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });
