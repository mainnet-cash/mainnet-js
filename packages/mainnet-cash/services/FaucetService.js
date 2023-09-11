/* eslint-disable no-unused-vars */
import Service from './Service.js';
import config  from '../config.js';
import * as mainnet from "mainnet-js";
import * as smartbch from "@mainnet-cash/smartbch";
import cluster from 'cluster';
import { ethers } from 'ethers';
import BigNumber from "bignumber.js";

const assertFaucetAvailable = () => {
  if ([config.FAUCET_CASHADDR, config.FAUCET_WIF,
       config.FAUCET_SBCH_ADDRESS, config.FAUCET_SBCH_PRIVKEY, config.FAUCET_SBCH_CONTRACT_ADDRESS, config.FAUCET_SBCH_TOKEN_ID].some(val => !val)) {
    throw new Error('Faucet service was not configured for this server');
  }
}

if (cluster.isMaster) {
  const worker = async () => {
    const db = new mainnet.SqlProvider();

    const wallet = await smartbch.TestNetSmartBchWallet.fromPrivateKey(config.FAUCET_SBCH_PRIVKEY);
    const contract = new smartbch.Contract(
      config.FAUCET_SBCH_CONTRACT_ADDRESS,
      smartbch.FaucetContract.abi,
      mainnet.Network.REGTEST
    );
    contract.setSigner(wallet);
    await db.init();
    let pending = false;
    wallet.provider.on("block", async (blockNumber) => {
      if (pending) {
        return;
      }
      // await db.beginTransaction();
      let faucetItems = await db.getFaucetQueue();

      if (!faucetItems.length) {
        return;
      }

      // limit to 20 addresses per block
      if (faucetItems.length > 20) {
        faucetItems = faucetItems.slice(0, 20);
      }

      const itemsToDelete = [...faucetItems];
      // remove duplicate requests to prevent abuse
      faucetItems = faucetItems.reduce((items, item) => items.find(val => val.address === item.address && val.token === item.token) ? [...items] : [...items, item], []);

      const tokenIds = faucetItems.map(val => val.token);
      const addresses = faucetItems.map(val => val.address);
      const hexValues = faucetItems.map(val => val.value);

      try {
        pending = true;
        const transactionResponse = await contract.send(tokenIds, addresses, hexValues, { gasPrice: ethers.BigNumber.from(10 ** 10), gasLimit: 1e7});
        transactionResponse
          .wait()
          .then(() => { pending = false; })
          .catch(() => { pending = false; });

        await db.deleteFaucetQueueItems(itemsToDelete);
        // await db.commitTransaction();
      } catch (e) {
        // console.log('error', e);
        // await db.rollbackTransaction();
        pending = false;
      };
    });
  }
  worker();
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
      if (!smartbch.Utils.isValidAddress(getTestnetSbchRequest.address))
        throw new Error("Incorrect SmartBch address");

      const receiverWallet = await smartbch.TestNetSmartBchWallet.watchOnly(getTestnetSbchRequest.address);
      const receiverBalance = await receiverWallet.getBalance("bch");
      const diff = 0.1 - receiverBalance;

      if (diff <= 0)
        throw new Error("You have 0.1 BCH or more. Refusing to refill.");

      const weiValue = smartbch.Utils.satToWei(diff * 1e8);

      let db = new mainnet.SqlProvider();
      await db.init();
      await db.addFaucetQueueItem(getTestnetSbchRequest.address, weiValue.toHexString());
      db.close();

      resolve(Service.successResponse({ success: true }));
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
      if (!smartbch.Utils.isValidAddress(getTestnetSep20Request.address))
        throw new Error("Incorrect SmartBch address");
      const receiverWallet = await smartbch.TestNetSmartBchWallet.watchOnly(getTestnetSep20Request.address);
      const receiverBalance = await receiverWallet.sep20.getBalance(getTestnetSep20Request.tokenId);
      const diff = new BigNumber(10).minus(receiverBalance.value);
      if (diff <= 0)
        throw new Error("You have 10 tokens or more of this type. Refusing to refill.");

      const decimals = await receiverWallet.sep20.getDecimals(getTestnetSep20Request.tokenId);
      const baseValue = ethers.BigNumber.from(diff.shiftedBy(decimals).toString());

      let db = new mainnet.SqlProvider();
      await db.init();
      await db.addFaucetQueueItem(getTestnetSep20Request.address, baseValue.toHexString());
      db.close();

      resolve(Service.successResponse({ success: true }));
    } catch (e) {
      // console.trace(e);
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
  getTestnetSbch,
  getTestnetSep20
};
