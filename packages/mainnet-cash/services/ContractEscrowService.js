/* eslint-disable no-unused-vars */
import Service from './Service.js';
import * as mainnet from "mainnet-js";
import { EscrowContract } from "@mainnet-cash/contract";


/**
* Create an escrow contract
*
* escrowRequest EscrowRequest Request a new escrow contract
* returns EscrowResponse
* */
const createEscrow = ({ escrowRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      escrowRequest.type = 'escrow'
      const resp = await EscrowContract.escrowContractFromJsonRequest(escrowRequest);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(JSON.stringify(e))
      reject(Service.rejectResponse(
        e,
        e.status || 405,
      ));
    }
  },
);

/**
* Get information about an escrow contract
*
* escrowInfoRequest EscrowInfoRequest Request a new escrow contract
* returns EscrowInfoResponse
* */
const escrowInfo = ({ escrowInfoRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const contract = await EscrowContract.fromId(escrowInfoRequest.escrowContractId);
      const resp = contract.info()
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(Service.rejectResponse(
        e,
        e.status || 405,
      ));
    }
  },
);



/**
* Finalize an escrow contract
*
* escrowFnRequest EscrowFnRequest null
* returns ContractFnResponse
* */
const escrowFn = ( {escrowFnRequest} ) => new Promise(
  async (resolve, reject) => {
    try {
      const contract = await EscrowContract.fromId(escrowFnRequest.escrowContractId);
      const wallet = await mainnet.walletFromId(escrowFnRequest.walletId)
      const resp = await contract._sendMax(
        wallet.privateKeyWif,
        escrowFnRequest.function, 
        escrowFnRequest.to,
        escrowFnRequest.getHexOnly, 
        escrowFnRequest.utxoIds
        );

      resolve(Service.successResponse({
        escrowContractId: escrowFnRequest.escrowContractId, 
        txId: resp.txid,
        hex: resp.hex
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e,
        e.status || 500,
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
const escrowUtxos = ({escrowContract}) => new Promise(
  async (resolve, reject) => {
    try {
      const contract = await EscrowContract.fromId(escrowContract.escrowContractId);
      const resp = await contract.getUtxos();
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);

export default {
  createEscrow,
  escrowFn,
  escrowInfo,
  escrowUtxos
};
