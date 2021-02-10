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
* escrowFnRequest EscrowFnRequest null
* returns ContractFnResponse
* */
const escrowFn = ( {escrowFnRequest} ) => new Promise(
  async (resolve, reject) => {
    try {
      let contract = await mainnet.EscrowContract.fromId(escrowFnRequest.contractId);
      let wallet = await mainnet.walletFromId(escrowFnRequest.walletId)
      let resp = await contract._sendMax(
        wallet.privateKeyWif,
        escrowFnRequest.method, 
        escrowFnRequest.to,
        escrowFnRequest.getHexOnly, 
        escrowFnRequest.utxoIds
        );

      resolve(Service.successResponse({
        contractId: escrowFnRequest.contractId, 
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


module.exports = {
  createEscrow,
  escrowFn
};
