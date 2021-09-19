/* eslint-disable no-unused-vars */
const Service = require('./Service');
var mainnet = require("mainnet-js");
var config  = require('../config');

const assertFaucetAvailable = () => {
  if ([config.FAUCET_CASHADDR, config.FAUCET_WIF, config.FAUCET_SLP_CASHADDR, config.FAUCET_SLP_WIF,
       config.FAUCET_SBCH_ADDRESS, config.FAUCET_SBCH_PRIVKEY, config.FAUCET_SBCH_TOKEN_ID].some(val => !val)) {
    throw new Error('Faucet service was not configured for this server');
  }
}

/**
* Get addresses to return back or donate the testnet bch and tokens 
*
* body oas_any_type_not_mapped Get addresses to return back or donate the testnet bch and tokens 
* returns GetAddressesResponse
* */
const getAddresses = () => new Promise(
  async (resolve, reject) => {
    try {
      assertFaucetAvailable();
      resolve(Service.successResponse({
        bchtest: config.FAUCET_CASHADDR,
        slptest: config.FAUCET_SLP_CASHADDR,
        sbchtest: config.FAUCET_SBCH_ADDRESS
      }));
    } catch (e) {
      // console.log(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

/**
* Get testnet bch 
*
* getTestnetBchRequest GetTestnetBchRequest Request to bch faucet 
* returns GetTestnetBchResponse
* */
const getTestnetBch = ({ getTestnetBchRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      assertFaucetAvailable();
      if (!mainnet.isValidAddress(getTestnetBchRequest.cashaddr))
        throw new Error("Incorrect cashaddr");

      const receiverWallet = await mainnet.TestNetWallet.watchOnly(getTestnetBchRequest.cashaddr);
      const receiverBalance = await receiverWallet.slpAware().getBalance("sat");
      const diff = 10000 - receiverBalance;
      if (diff <= 0)
        throw new Error("You have 10000 sats or more. Refusing to refill.");

      const wallet = await mainnet.TestNetWallet.fromWIF(config.FAUCET_WIF);
      wallet.slpAware();
      const sendResponse = await wallet.send([{cashaddr: getTestnetBchRequest.cashaddr, value: diff, unit: "sat"}]);
      resolve(Service.successResponse({ txId: sendResponse.txId }));
    } catch (e) {
      // console.log(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

/**
* Get testnet slp tokens 
*
* getTestnetSlpRequest GetTestnetSlpRequest Request to slp faucet 
* returns GetTestnetSlpResponse
* */
const getTestnetSlp = ({ getTestnetSlpRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      assertFaucetAvailable();
      if (!mainnet.isValidAddress(getTestnetSlpRequest.slpaddr))
        throw new Error("Incorrect slpaddr");

      const receiverWallet = await mainnet.TestNetWallet.watchOnly(getTestnetSlpRequest.slpaddr);
      const receiverBalance = await receiverWallet.slp.getBalance(getTestnetSlpRequest.tokenId);
      const diff = 10 - (receiverBalance.value.toNumber());
      if (diff <= 0)
        throw new Error("You have 10 tokens or more of this type. Refusing to refill.");

      const wallet = await mainnet.TestNetWallet.fromWIF(config.FAUCET_SLP_WIF);
      wallet.slpAware();
      const sendResponse = await wallet.slp.send([{slpaddr: getTestnetSlpRequest.slpaddr, value: diff, tokenId: getTestnetSlpRequest.tokenId}]);
      resolve(Service.successResponse({ txId: sendResponse.txId }));
    } catch (e) {
      // console.log(e, getTestnetSlpRequest);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get testnet SmartBCH bch 
*
* getTestnetSbchRequest GetTestnetSbchRequest Request to bch faucet 
* returns GetTestnetSbchResponse
* */
const getTestnetSbch = ({ getTestnetSbchRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      assertFaucetAvailable();
      if (!mainnet.SmartBch.isValidAddress(getTestnetSbchRequest.address))
        throw new Error("Incorrect SmartBch address");

      const receiverWallet = await mainnet.TestNetSmartBchWallet.watchOnly(getTestnetSbchRequest.address);
      const receiverBalance = await receiverWallet.getBalance("bch");
      const diff = 0.1 - receiverBalance;
      if (diff <= 0)
        throw new Error("You have 0.1 BCH or more. Refusing to refill.");

      const wallet = await mainnet.TestNetSmartBchWallet.fromPrivateKey(config.FAUCET_SBCH_PRIVKEY);
      const sendResponse = await wallet.send([{address: getTestnetSbchRequest.address, value: diff, unit: "BCH"}], {}, { gasPrice: 10 ** 10 });
      resolve(Service.successResponse({ txId: sendResponse[0].txId }));
    } catch (e) {
      // console.trace(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get testnet SmartBch SEP20 tokens 
*
* getTestnetSep20Request GetTestnetSep20Request Request to SEP20 faucet 
* returns GetTestnetSep20Response
* */
const getTestnetSep20 = ({ getTestnetSep20Request }) => new Promise(
  async (resolve, reject) => {
    try {
      assertFaucetAvailable();
      if (!mainnet.SmartBch.isValidAddress(getTestnetSep20Request.address))
      throw new Error("Incorrect SmartBch address");

      const receiverWallet = await mainnet.TestNetSmartBchWallet.watchOnly(getTestnetSep20Request.address);
      const receiverBalance = await receiverWallet.sep20.getBalance(getTestnetSep20Request.tokenId);
      const diff = 10 - (receiverBalance.value.toNumber());
      if (diff <= 0)
        throw new Error("You have 10 tokens or more of this type. Refusing to refill.");

      const wallet = await mainnet.TestNetSmartBchWallet.fromPrivateKey(config.FAUCET_SBCH_PRIVKEY);
      const sendResponse = await wallet.sep20.send([{address: getTestnetSep20Request.address, value: diff, tokenId: getTestnetSep20Request.tokenId}], { gasPrice: 10 ** 10 });
      resolve(Service.successResponse({ txId: sendResponse[0].txId }));
    } catch (e) {
      // console.trace(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  getAddresses,
  getTestnetBch,
  getTestnetSlp,
  getTestnetSbch,
  getTestnetSep20
};
