/* eslint-disable no-unused-vars */
import { Service } from "./Service";

// @ts-ignore
import * as core from "express-serve-static-core";

/**
* Create an escrow contract
*
* escrowRequest EscrowRequest Request a new escrow contract
* returns EscrowResponse
* */
export const createEscrow = ({ escrowRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        escrowRequest,
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
* Finalize an escrow contract
*
* escrowFinalizeRequest EscrowFinalizeRequest 
* returns EscrowResponse
* */
export const escrowFinalize = ({ escrowFinalizeRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        escrowFinalizeRequest,
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
* List specific utxos in a contract
* Returns all UTXOs that can be spent by the  contract. Both confirmed and unconfirmed UTXOs are included. 
*
* contract Contract 
* returns UtxoResponse
* */
export const escrowUtxos = ({ contract }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        contract,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || "Invalid input",
        e.status || 405,
      ));
    }
  },
);
