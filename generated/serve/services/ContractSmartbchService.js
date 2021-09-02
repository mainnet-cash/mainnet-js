/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* Call a SmartBch contract function
*
* smartBchContractFnCallRequest SmartBchContractFnCallRequest 
* returns SmartBchContractFnCallResponse
* */
const smartBchContractCall = ({ smartBchContractFnCallRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const walletId = smartBchContractFnCallRequest.walletId;
      const contractId = smartBchContractFnCallRequest.contractId;
      const contract = mainnet.SmartBch.Contract.fromId(contractId);

      if (!smartBchContractFnCallRequest.arguments) {
        smartBchContractFnCallRequest.arguments = [];
      }

      if (walletId) {
        const signer = mainnet.SmartBch.walletFromId(walletId);
        contract.setSigner(signer);
      }

      const response = contract.runFunctionFromStrings(smartBchContractFnCallRequest);
      resolve(Service.successResponse({ response }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Create a SmartBch contractId
*
* smartBchContractRequest SmartBchContractRequest Create a new smartbch contract with solidity source code
* returns SmartBchContractResponse
* */
const smartBchContractCreate = ({ smartBchContractRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let resp = await mainnet.SmartBch.Contract.contractRespFromJsonRequest(smartBchContractRequest);
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
* Request to deploy a SmartBch contract
*
* smartBchContractDeployRequest SmartBchContractDeployRequest Request to deploy a SmartBch contract
* returns SmartBchContractDeployResponse
* */
const smartBchContractDeploy = ({ smartBchContractDeployRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const walletId = smartBchContractDeployRequest.walletId;
      const script = smartBchContractDeployRequest.script;
      const parameters = smartBchContractDeployRequest.parameters || [];
      const overrides = smartBchContractDeployRequest.overrides || {};

      const signer = mainnet.SmartBch.walletFromId(walletId);

      const contract = await mainnet.SmartBch.Contract.deploy(signer, script, ...parameters, overrides);
      resolve(Service.successResponse({
        contractId: contract.toString(),
        txId: contract.receipt.transactionHash,
        receipt: contract.receipt
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
* Estimate the gas for a contract interaction function given the arguments
*
* smartBchContractEstimateGasRequest SmartBchContractEstimateGasRequest 
* returns SmartBchContractEstimateGasResponse
* */
const smartBchContractEstimateGas = ({ smartBchContractEstimateGasRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const contractId = smartBchContractEstimateGasRequest.contractId;
      const functionName = smartBchContractEstimateGasRequest.function;
      const arguments = smartBchContractEstimateGasRequest.arguments || [];
      const overrides = smartBchContractEstimateGasRequest.overrides || {};

      const contract = mainnet.SmartBch.Contract.fromId(contractId);

      const response = contract.estimateGas(functionName, ...arguments, overrides);
      resolve(Service.successResponse({ response }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get information about a SmartBch contract from the contractId
*
* smartBchContractInfoRequest SmartBchContractInfoRequest Request parsed information regarding a SmartBch contract from the smartBchContractId
* returns SmartBchContractInfoResponse
* */
const smartBchContractInfo = ({ smartBchContractInfoRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const contractId = smartBchContractInfoRequest.contractId;
      const contract = mainnet.SmartBch.Contract.fromId(contractId);

      const response = contract.info()

      resolve(Service.successResponse({ ...response }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  smartBchContractCall,
  smartBchContractCreate,
  smartBchContractDeploy,
  smartBchContractEstimateGas,
  smartBchContractInfo,
};
