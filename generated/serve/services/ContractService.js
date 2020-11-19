/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("../lib/mainnet/mainnet-node-0.0.1-rc");
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
* contractFnRequest ContractFnRequest null
* returns ContractFnResponse
* */
const escrowFn = ({ contractFnRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let contract = await mainnet.contractFromId(contractFnRequest.contractId);
      let wallet = await mainnet.walletFromId(contractFnRequest.walletId)
      
      let resp = await contract.run(
        wallet.privateKeyWif,
        contractFnRequest.action, 
        contractFnRequest.getHexOnly, 
        contractFnRequest.utxos 
        );

      resolve(Service.successResponse({
        contractId: contractFnRequest.contractId, 
        txId: resp.txid,
        hex: resp.hex
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
const escrowUtxos = ({contract}) => new Promise(
  async (resolve, reject) => {
    try {
      let c = await mainnet.contractFromId(contract.contractId);
      let resp = await c.getUtxos();
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
  escrowFn,
  escrowUtxos,
};
