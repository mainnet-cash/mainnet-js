
import { Service } from "../generated/serve/services/Service";

// @ts-ignore
import * as core from "express-serve-static-core";

/**
* Get total balance for wallet
*
* serializedWallet SerializedWallet Request for a wallet balance 
* returns BalanceResponse
* */
export const balance = ({ serializedWallet }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        serializedWallet,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || "Invalid input",
        e.status || 405,
      ));
    }
  },
);