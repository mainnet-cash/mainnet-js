/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");
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
        e,
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
      let contract = await mainnet.EscrowContract.fromId(contractFnRequest.contractId);
      let wallet = await mainnet.walletFromId(contractFnRequest.walletId)
      let utxos = contractFnRequest.utxoIds ? contractFnRequest.utxoIds.map(u => {return mainnet.Mainnet.deserializeUtxo(u)}) : undefined
      let resp = await contract._sendMax(
        wallet.privateKeyWif,
        contractFnRequest.action, 
        contractFnRequest.to,
        contractFnRequest.getHexOnly, 
        utxos
        );

      resolve(Service.successResponse({
        contractId: contractFnRequest.contractId, 
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
const escrowUtxos = ({contract}) => new Promise(
  async (resolve, reject) => {
    try {
      let c = await mainnet.contractFromId(contract.contractId);
      let resp = await c.getUtxos();
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {

      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);

module.exports = {
  createEscrow,
  escrowFn,
  escrowUtxos,
};
