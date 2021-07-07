/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* Create a cashscript contract
*
* contractRequest ContractRequest Request a new cashscript contract
* returns ContractResponse
* */
const createContract = ({ contractRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let resp = await mainnet.createContractResponse(contractRequest);
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
* Call a method on a contract
*
* contractFnRequest ContractFnRequest null
* returns ContractFnResponse
* */
const contractFn = ({ contractFnRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let contract = await mainnet.Contract.fromId(contractFnRequest.contractId);
      resp = await contract.runFunctionFromStrings(contractFnRequest)
      let marshaledResponse = {contractId: contractFnRequest.contractId}
      if(typeof resp === 'string' || resp instanceof String){
        if(contractFnRequest.action === "meep"){
          marshaledResponse.debug = resp
        }else{
          marshaledResponse.hex = resp
        }
      }else{
        marshaledResponse.txId = resp.txid
        marshaledResponse.hex = resp.hex
      }      
      resolve(Service.successResponse({... marshaledResponse}));
    } catch (e) {
      reject(Service.rejectResponse(
        e,
        e.status || 500,
      ));
    }
   },
);


/**
* Call a method on a contract
*
* contractFnRequest ContractFnRequest null
* returns ContractFnResponse
* */
const contractInfo = ( {contractInfoRequest } ) => new Promise(
  async (resolve, reject) => {
    try {
      let contract = await mainnet.Contract.fromId(contractInfoRequest.contractId);    
      
      let resp = contract.info();
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
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
const contractUtxos = ({contract}) => new Promise(
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
  createContract,
  contractFn,
  contractInfo,
  contractUtxos,
};
