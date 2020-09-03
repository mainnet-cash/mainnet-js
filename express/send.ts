import { Service } from "../generated/serve/services/Service";
import { SendRequest } from "../generated/client/typescript-mock/model/sendRequest";
import { SendResponse } from "../generated/client/typescript-mock/model/sendResponse";
import { walletFromIdString } from "../src/util/walletFromIdString"
import { balanceResponseFromSatoshi } from "../src/util/balanceObjectFromSatoshi"
import { BalanceResponse } from "../generated/client/typescript-mock/model/balanceResponse"
import { binToHex } from "@bitauth/libauth"
/**
* Send some amount to a given address
*
* sendRequest List place a send request
* returns SendResponse
* */
export const send = ({ sendRequest }) => new Promise(
    async (resolve, reject) => {
        try {
            let resp = new SendResponse();
            let wallet = walletFromIdString(sendRequest.walletId)
            
            if (wallet) {
                let result = wallet.send(sendRequest)
                resp.transaction = binToHex(result)
                resp.balance = balanceResponseFromSatoshi(wallet.balance(), result.getAttributeTypeMap())
              resolve(Service.successResponse({ ...resp }));
            }
          } catch (e) {
            console.log(JSON.stringify(e));
            reject(
              Service.rejectResponse(e.message || "Invalid input", e.status || 500)
            );
          }
    },
  );