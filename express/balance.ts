import { Service } from "../generated/serve/services/Service";
import { walletFromIdString } from "../src/util/walletFromIdString";
import { BalanceResponse } from "../generated/client/typescript-mock/model/balanceResponse";
import { balanceResponseFromSatoshi } from "../src/util/balanceObjectFromSatoshi";
// @ts-ignore
import * as core from "express-serve-static-core";

/**
 * Get total balance for wallet
 *
 * serializedWallet SerializedWallet Request for a wallet balance
 * returns BalanceResponse
 * */
export const balance = (request) =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await walletFromIdString(request.body.walletId);
      if (wallet) {
        let resp = new BalanceResponse();

        resp = balanceResponseFromSatoshi(
          await wallet.getBalance(wallet.cashaddr as string)
        );
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
