/* eslint-disable no-unused-vars */
import Service from './Service.js';
import * as mainnet from "mainnet-js";

/**
* Decode a bitcoin transaction. Accepts both transaction hash or raw transaction in hex format.
*
* utilDecodeTransactionRequest UtilDecodeTransactionRequest Request to decode a transaction 
* returns ElectrumRawTransaction
* */
const utilDecodeTransaction = ({ utilDecodeTransactionRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.createWallet({ network: utilDecodeTransactionRequest.network });
      const resp = await wallet.util.decodeTransaction(utilDecodeTransactionRequest.transactionHashOrHex, utilDecodeTransactionRequest.loadInputValues);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

export default {
  utilDecodeTransaction,
};
