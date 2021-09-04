/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* Get total SmartBch ERC20 token balance of the wallet
*
* smartBchErc20BalanceRequest SmartBchErc20BalanceRequest Request for a wallet SmartBch ERC20 token balance 
* returns SmartBchErc20BalanceResponse
* */
const smartBchErc20Balance = ({ smartBchErc20BalanceRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchErc20BalanceRequest.walletId);
      const response = await wallet.erc20.getBalance(smartBchErc20BalanceRequest.tokenId);

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
* Get an SmartBch ERC20 deposit address in cash address format
*
* serializedWallet SerializedWallet Request for an SmartBch ERC20 deposit address given a wallet 
* returns SmartBchErc20DepositAddressResponse
* */
const smartBchErc20DepositAddress = ({ serializedWallet }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(serializedWallet.walletId);
      const response = wallet.erc20.getDepositAddress();

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
* Get an SmartBch ERC20 receiving address as a qrcode
*
* serializedWallet SerializedWallet Request for a SmartBch ERC20 deposit address as a Quick Response code (qrcode) 
* returns ScalableVectorGraphic
* */
const smartBchErc20DepositQr = ({ serializedWallet }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(serializedWallet.walletId);
      const response = wallet.erc20.getDepositAddress();

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
* Get created tokenId back and new SmartBch ERC20 token balance of the wallet
*
* smartBchErc20GenesisRequest SmartBchErc20GenesisRequest Request to create a new SmartBch ERC20 token (genesis) 
* returns SmartBchErc20GenesisResponse
* */
const smartBchErc20Genesis = ({ smartBchErc20GenesisRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchErc20GenesisRequest.walletId);
      const options = { ...smartBchErc20GenesisRequest };
      delete options.walletId;
      delete options.overrides;

      const overrides = smartBchErc20GenesisRequest.overrides;
      const response = await wallet.erc20.genesis(options, overrides);

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
* Get created tokenId back and new SmartBch ERC20 token balance of the wallet
*
* smartBchErc20MintRequest SmartBchErc20MintRequest Request to mint more of SmartBch ERC20 tokens 
* returns SmartBchErc20MintResponse
* */
const smartBchErc20Mint = ({ smartBchErc20MintRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchErc20MintRequest.walletId);
      const options = { ...smartBchErc20MintRequest };
      delete options.walletId;
      delete options.overrides;

      const overrides = smartBchErc20MintRequest.overrides;
      const response = await wallet.erc20.mint(options, overrides);

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
* Send some SmartBch ERC20 token amount to a given address
*
* smartBchErc20SendRequest SmartBchErc20SendRequest place a SmartBch ERC20 token send request
* returns List
* */
const smartBchErc20Send = ({ smartBchErc20SendRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchErc20SendRequest.walletId);
      const requests = smartBchErc20SendRequest.to;
      const overrides = smartBchErc20SendRequest.overrides;
      const response = await wallet.erc20.send(requests, overrides);

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
* Send all available SmartBch ERC20 token funds to a given address
*
* smartBchErc20SendMaxRequest SmartBchErc20SendMaxRequest Request to send all available SmartBch ERC20 token funds to a given address
* returns List
* */
const smartBchErc20SendMax = ({ smartBchErc20SendMaxRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchErc20SendMaxRequest.walletId);
      const overrides = smartBchErc20SendMaxRequest.overrides;
      const response = await wallet.erc20.sendMax(smartBchErc20SendMaxRequest.address, smartBchErc20SendMaxRequest.tokenId, overrides);

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
* Get information about the SmartBch ERC20 token
*
* smartBchErc20TokenInfoRequest SmartBchErc20TokenInfoRequest Request to get information about the SmartBch ERC20 token 
* returns SmartBchErc20TokenInfoResponse
* */
const smartBchErc20TokenInfo = ({ smartBchErc20TokenInfoRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchErc20TokenInfoRequest.walletId);
      const response = await wallet.erc20.getTokenInfo(smartBchErc20TokenInfoRequest.tokenId);

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
  smartBchErc20Balance,
  smartBchErc20DepositAddress,
  smartBchErc20DepositQr,
  smartBchErc20Genesis,
  smartBchErc20Mint,
  smartBchErc20Send,
  smartBchErc20SendMax,
  smartBchErc20TokenInfo,
};
