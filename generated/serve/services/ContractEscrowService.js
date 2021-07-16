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
      let resp = await mainnet.EscrowContract.escrowContractFromJsonRequest(escrowRequest);
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
* Get information about an escrow contract
*
* escrowInfoRequest EscrowInfoRequest Request a new escrow contract
* returns EscrowInfoResponse
* */
const escrowInfo = ({ escrowInfoRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let contract = await mainnet.EscrowContract.fromId(escrowInfoRequest.escrowContractId);
      resp = contract.info()
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
      let contract = await mainnet.EscrowContract.fromId(escrowFnRequest.escrowContractId);
      let wallet = await mainnet.walletFromId(escrowFnRequest.walletId)
      let resp = await contract._sendMax(
        wallet.privateKeyWif,
        escrowFnRequest.method, 
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
      let c = await mainnet.EscrowContract.fromId(escrowContract.escrowContractId);
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
  escrowInfo,
  escrowUtxos
};
