/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Create an escrow contract
*
* escrowRequest EscrowRequest Request a new escrow contract
* returns EscrowResponse
* */
const createEscrow = ({ escrowRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        escrowRequest,
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
* Finalize an escrow contract
*
* escrowFinalizeRequest EscrowFinalizeRequest null
* returns EscrowResponse
* */
const escrowFinalize = ({ escrowFinalizeRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        escrowFinalizeRequest,
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
const escrowUtxos = ({ contract }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        contract,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  createEscrow,
  escrowFinalize,
  escrowUtxos,
};
