/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("../../../dist/mainnet-node-0.0.1-rc");
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
      let resp = await mainnet.createContractResponse(escrowRequest);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);


/**
* Finalize an escrow contract
*
* escrowCallRequest EscrowFinalizeRequest null
* returns EscrowCallResponse
* */
const escrowCall = ({ escrowCallRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let contract = await mainnet.contractFromId(escrowCallRequest.contractId);
      let wallet = await mainnet.walletFromId(escrowCallRequest.walletId)
      let action = escrowCallRequest.action 
      let resp = await contract.run(wallet.privateKeyWif,action);
      resolve(Service.successResponse({
        resp
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
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
const escrowUtxos = ({ serializedContract }) => new Promise(
  async (resolve, reject) => {
    try {
      let contract = await mainnet.escrowFromId(serializedContract.contractId);
      let resp = await contract.getUtxos();
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(e);
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  },
);

module.exports = {
  createEscrow,
  escrowCall,
  escrowUtxos,
};
