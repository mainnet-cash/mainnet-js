/* eslint-disable no-unused-vars */
import { Service } from "./Service";

// @ts-ignore
import * as core from "express-serve-static-core";

/**
* Get total balance for wallet
*
* balanceRequest BalanceRequest Request for a wallet balance 
* returns BalanceResponse
* */
export const balance = ({ balanceRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        balanceRequest,
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
* returns ScalableVectorGraphic
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
* maxAmountToSendRequest MaxAmountToSendRequest get amount that will be spend with a spend max request. If a unit type is specified, a numeric value will be returned.
* returns BalanceResponse
* */
export const maxAmountToSend = ({ maxAmountToSendRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        maxAmountToSendRequest,
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
* Send some amount to a given address
*
* sendRequest SendRequest place a send request
* returns SendResponse
* */
export const send = ({ sendRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        sendRequest,
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
* Send all available funds to a given address
*
* sendMaxRequest SendMaxRequest Request to all available funds to a given address
* returns SendMaxResponse
* */
export const sendMax = ({ sendMaxRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        sendMaxRequest,
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
