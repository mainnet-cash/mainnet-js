import { Service } from "../../generated/serve/services/Service";
import { walletFromIdString } from "../../src/wallet/createWallet";
import { BalanceResponse } from "../../generated/client/typescript-mock/model/balanceResponse";

// @ts-ignore
import * as core from "express-serve-static-core";

/**
 * Get maximum spendable amount
 *
 * maxAmountToSendRequest MaxAmountToSendRequest get amount that will be spend with a spend max request
 * returns BalanceResponse
 * */

export const maxAmountToSend = (request) =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await walletFromIdString(request.body.walletId);
      if (wallet) {
        let resp = new BalanceResponse();

        resp = await wallet.getMaxAmountToSpend(1);
        resolve(Service.successResponse({ ...resp }));
      } else {
        throw Error("Could not derive wallet");
      }
    } catch (e) {
      console.log(JSON.stringify(e));
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  });
