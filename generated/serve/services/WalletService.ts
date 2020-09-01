/* eslint-disable no-unused-vars */
import { Service } from "./Service";

// @ts-ignore
import * as core from "express-serve-static-core";

/**
* create a new wallet
*
* walletRequest WalletRequest Request a new new random wallet
* returns WalletResponse
* */
export const createWallet = ({ walletRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        walletRequest,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || "Invalid input",
        e.status || 405,
      ));
    }
  },
);
