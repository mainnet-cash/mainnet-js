/* eslint-disable no-unused-vars */
import Service from "./Service.js";
import { Contract } from "@mainnet-cash/contract";

/**
* Create a cashscript contract
*
* contractRequest ContractRequest Request a new cashscript contract
* returns ContractResponse
* */
const createContract = ({ contractRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const resp = await Contract.contractRespFromJsonRequest(contractRequest);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.trace(e)
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
      const contract = await Contract.fromId(contractFnRequest.contractId);
      const resp = await contract.runFunctionFromStrings(contractFnRequest)
      const marshaledResponse = {contractId: contractFnRequest.contractId}
      if(typeof resp === 'string' || resp instanceof String){
        if(contractFnRequest.action === "meep"){
          marshaledResponse.debug = resp
        }else{
          marshaledResponse.hex = resp
        }
      }else{
        marshaledResponse.txid = resp.txid
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
      const contract = Contract.fromId(contractInfoRequest.contractId);
      const resp = contract.info();
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
      const _contract = Contract.fromId(contract.contractId);
      const resp = await _contract.getUtxos();
      resolve(Service.successResponse(resp));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);

export default {
  createContract,
  contractFn,
  contractInfo,
  contractUtxos,
};
