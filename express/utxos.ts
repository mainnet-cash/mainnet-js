import { binToHex } from "@bitauth/libauth";

import { Service } from "../generated/serve/services/Service";
import { walletFromIdString } from "../src/util/walletFromIdString";
import { UtxoResponse } from "../generated/client/typescript-mock/model/utxoResponse";
import { Utxo } from "../generated/client/typescript-mock/model/utxo";
import { UnitType } from "../src/wallet/Base";
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
        let result = await wallet.getUtxos(wallet.cashaddr);
        let resp = new UtxoResponse();
        resp.utxos = await Promise.all(
          result.map(async (o: UnspentOutput) => {
            let utxo = new Utxo();
            utxo.amount = new Amount();
            utxo.amount.unit = UnitType.UnitEnum.Sat;
            utxo.amount.value = o!.getValue();
            let txId = o!.getOutpoint()!.getHash_asU8() || new Uint8Array([]);
            utxo.transaction = binToHex(txId);
            utxo.index = o!.getOutpoint()!.getIndex();
            utxo.utxoId = utxo.transaction + ":" + utxo.index;
            return utxo;
          })
        );

        resolve(Service.successResponse({ ...resp }));
      }
    } catch (e) {
      console.log(JSON.stringify(e));
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });
