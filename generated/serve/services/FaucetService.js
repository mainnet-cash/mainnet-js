/* eslint-disable no-unused-vars */
const Service = require('./Service');
var mainnet = require("mainnet-js");
var bchaddr = require('bchaddrjs-slp');
var config  = require('../config');

/**
* Get addresses to return back or donate the testnet bch and tokens 
*
* body oas_any_type_not_mapped Get addresses to return back or donate the testnet bch and tokens 
* returns GetAddressesResponse
* */
const getAddresses = () => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        bchtest: config.FAUCET_CASHADDR,
        slptest: config.FAUCET_SLP_CASHADDR
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
* Get testnet bch 
*
* getTestnetBchRequest GetTestnetBchRequest Request to bch faucet 
* returns GetTestnetBchResponse
* */
const getTestnetBch = ({ getTestnetBchRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      if (!bchaddr.isValidAddress(getTestnetBchRequest.cashaddr))
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
      if (!bchaddr.isValidAddress(getTestnetSlpRequest.cashaddr))
        throw new Error("Incorrect cashaddr");

      const receiverWallet = await mainnet.TestNetWallet.watchOnly(getTestnetSlpRequest.cashaddr);
      const receiverBalance = await receiverWallet.slp.getBalance(getTestnetSlpRequest.ticker, getTestnetSlpRequest.tokenId);
      const diff = 10 - (receiverBalance.length ? receiverBalance[0].amount : 0);
      if (diff <= 0)
        throw new Error("You have 10 tokens or more of this type. Refusing to refill.");

      const wallet = await mainnet.TestNetWallet.fromWIF(config.FAUCET_SLP_WIF);
      wallet.slpAware();
      const sendResponse = await wallet.slp.send([{cashaddr: getTestnetSlpRequest.cashaddr, value: diff, ticker: getTestnetSlpRequest.ticker, tokenId: getTestnetSlpRequest.tokenId}]);
      resolve(Service.successResponse({ txId: sendResponse.txId }));
    } catch (e) {
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
  getTestnetSlp
};
