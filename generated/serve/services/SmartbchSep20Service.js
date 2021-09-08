/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* Get total SmartBch SEP20 token balance of the wallet
*
* smartBchSep20BalanceRequest SmartBchSep20BalanceRequest Request for a wallet SmartBch SEP20 token balance 
* returns SmartBchSep20BalanceResponse
* */
const smartBchSep20Balance = ({ smartBchSep20BalanceRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchSep20BalanceRequest.walletId);
      const response = await wallet.sep20.getBalance(smartBchSep20BalanceRequest.tokenId);

      resolve(Service.successResponse({ ...response }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get an SmartBch SEP20 deposit address in cash address format
*
* serializedWallet SerializedWallet Request for an SmartBch SEP20 deposit address given a wallet 
* returns SmartBchSep20DepositAddressResponse
* */
const smartBchSep20DepositAddress = ({ serializedWallet }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(serializedWallet.walletId);
      const response = wallet.sep20.getDepositAddress();

      resolve(Service.successResponse({ address: response }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get an SmartBch SEP20 receiving address as a qrcode
*
* serializedWallet SerializedWallet Request for a SmartBch SEP20 deposit address as a Quick Response code (qrcode) 
* returns ScalableVectorGraphic
* */
const smartBchSep20DepositQr = ({ serializedWallet }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(serializedWallet.walletId);
      const response = wallet.sep20.getDepositAddress();

      resolve(Service.successResponse({ ...response }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get created tokenId back and new SmartBch SEP20 token balance of the wallet
*
* smartBchSep20GenesisRequest SmartBchSep20GenesisRequest Request to create a new SmartBch SEP20 token (genesis) 
* returns SmartBchSep20GenesisResponse
* */
const smartBchSep20Genesis = ({ smartBchSep20GenesisRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchSep20GenesisRequest.walletId);
      const options = { ...smartBchSep20GenesisRequest };
      delete options.walletId;
      delete options.overrides;

      const overrides = smartBchSep20GenesisRequest.overrides;
      const response = await wallet.sep20.genesis(options, overrides);

      resolve(Service.successResponse({ ...response }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get created tokenId back and new SmartBch SEP20 token balance of the wallet
*
* smartBchSep20MintRequest SmartBchSep20MintRequest Request to mint more of SmartBch SEP20 tokens 
* returns SmartBchSep20MintResponse
* */
const smartBchSep20Mint = ({ smartBchSep20MintRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchSep20MintRequest.walletId);
      const options = { ...smartBchSep20MintRequest };
      delete options.walletId;
      delete options.overrides;

      const overrides = smartBchSep20MintRequest.overrides;
      const response = await wallet.sep20.mint(options, overrides);

      resolve(Service.successResponse({ ...response }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Send some SmartBch SEP20 token amount to a given address
*
* smartBchSep20SendRequest SmartBchSep20SendRequest place a SmartBch SEP20 token send request
* returns List
* */
const smartBchSep20Send = ({ smartBchSep20SendRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchSep20SendRequest.walletId);
      const requests = smartBchSep20SendRequest.to;
      const overrides = smartBchSep20SendRequest.overrides;
      const response = await wallet.sep20.send(requests, overrides);

      resolve(Service.successResponse(response));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Send all available SmartBch SEP20 token funds to a given address
*
* smartBchSep20SendMaxRequest SmartBchSep20SendMaxRequest Request to send all available SmartBch SEP20 token funds to a given address
* returns List
* */
const smartBchSep20SendMax = ({ smartBchSep20SendMaxRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchSep20SendMaxRequest.walletId);
      const overrides = smartBchSep20SendMaxRequest.overrides;
      const response = await wallet.sep20.sendMax(smartBchSep20SendMaxRequest.address, smartBchSep20SendMaxRequest.tokenId, overrides);

      resolve(Service.successResponse(response));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get information about the SmartBch SEP20 token
*
* smartBchSep20TokenInfoRequest SmartBchSep20TokenInfoRequest Request to get information about the SmartBch SEP20 token 
* returns SmartBchSep20TokenInfoResponse
* */
const smartBchSep20TokenInfo = ({ smartBchSep20TokenInfoRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchSep20TokenInfoRequest.walletId);
      const response = await wallet.sep20.getTokenInfo(smartBchSep20TokenInfoRequest.tokenId);

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
  smartBchSep20Balance,
  smartBchSep20DepositAddress,
  smartBchSep20DepositQr,
  smartBchSep20Genesis,
  smartBchSep20Mint,
  smartBchSep20Send,
  smartBchSep20SendMax,
  smartBchSep20TokenInfo,
};
