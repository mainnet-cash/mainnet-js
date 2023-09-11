/* eslint-disable no-unused-vars */
import Service from './Service.js';
import config  from '../config.js';
import * as mainnet from "mainnet-js";

const assertFaucetAvailable = () => {
  if ([config.FAUCET_CASHADDR, config.FAUCET_WIF,
       config.FAUCET_SBCH_ADDRESS, config.FAUCET_SBCH_PRIVKEY, config.FAUCET_SBCH_CONTRACT_ADDRESS, config.FAUCET_SBCH_TOKEN_ID].some(val => !val)) {
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
        sbchtest: config.FAUCET_SBCH_ADDRESS,
        sbchcontract: config.FAUCET_SBCH_CONTRACT_ADDRESS,
        sbchtoken: config.FAUCET_SBCH_TOKEN_ID,
      }));
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
      const receiverBalance = await receiverWallet.slpSemiAware().getBalance("sat");
      const diff = 10000 - receiverBalance;
      if (diff <= 0)
        throw new Error("You have 10000 sats or more. Refusing to refill.");

      const wallet = await mainnet.TestNetWallet.fromWIF(config.FAUCET_WIF);
      wallet.slpSemiAware();
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

export default {
  getAddresses,
  getTestnetBch,
};
