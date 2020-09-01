/* eslint-disable no-unused-vars */
import { Service } from "./Service";

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
/**
* Get a deposit address in cash address format
*
* serializedWallet SerializedWallet Request for a deposit address given a wallet 
* returns DepositAddressResponse
* */
export const depositAddress = ({ serializedWallet }) => new Promise(
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
/**
* Get receiving cash address as a qrcode
*
* serializedWallet SerializedWallet Request for a deposit cash address as a Quick Response code (qrcode) 
* returns PortableNetworkGraphic
* */
export const depositQr = ({ serializedWallet }) => new Promise(
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
/**
* Get maximum spendable amount
*
* uNKNOWNUnderscoreBASEUnderscoreTYPE UNKNOWN_BASE_TYPE get amount that will be spend with a spend max request
* returns BalanceResponse
* */
export const maxAmountToSend = ({ uNKNOWNUnderscoreBASEUnderscoreTYPE }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        uNKNOWNUnderscoreBASEUnderscoreTYPE,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || "Invalid input",
        e.status || 405,
      ));
    }
  },
);
/**
* Get detailed information about unspent outputs (utxos)
*
* serializedWallet SerializedWallet Request detailed list of unspent transaction outputs 
* returns UtxoResponse
* */
export const utxos = ({ serializedWallet }) => new Promise(
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
