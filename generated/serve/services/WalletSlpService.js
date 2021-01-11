/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* Get total slp balances of the wallet
*
* slpBalanceRequest SlpBalanceRequest Request for a wallet slp balances 
* returns List
* */
const slpBalance = ({ slpBalanceRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(slpBalanceRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }

      // the balance unit may also be empty
      let resp = await wallet.slp.getBalance(slpBalanceRequest.ticker, slpBalanceRequest.tokenId);
      resolve(Service.successResponse(resp));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }

  },
);
/**
* Get an SLP deposit address in cash address format
*
* serializedWallet SerializedWallet Request for an SLP deposit address given a wallet 
* returns DepositAddressResponse
* */
const slpDepositAddress = ({ serializedWallet }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(serializedWallet.walletId);
      let args = serializedWallet;
      delete args.walletId;
      let resp = await wallet.slp.getDepositAddress(args);
      resp = {cashaddr:resp}
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);
/**
* Get an SLP receiving cash address as a qrcode
*
* serializedWallet SerializedWallet Request for an SLP deposit cash address as a Quick Response code (qrcode) 
* returns ScalableVectorGraphic
* */
const slpDepositQr = ({ serializedWallet }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(serializedWallet.walletId);
      let args = serializedWallet;
      delete args.walletId;
      let resp = await wallet.slp.getDepositQr(args);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);
/**
* Get created tokenId back and new slp balances of the wallet
*
* slpGenesisRequest SlpGenesisRequest Request to create a new SLP token (genesis) 
* returns SlpGenesisResponse
* */
const slpGenesis = ({ slpGenesisRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(serializedWallet.walletId);
      let args = serializedWallet;
      delete args.walletId;
      let resp = await wallet.slp.slpGenesis(args);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);
/**
* Get created tokenId back and new slp balances of the wallet
*
* slpMintRequest SlpMintRequest Request to mint more of SLP tokens 
* returns SlpMintResponse
* */
const slpMint = ({ slpMintRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(serializedWallet.walletId);
      let args = serializedWallet;
      delete args.walletId;
      let resp = await wallet.slp.mint(arg.amount, args.ticker, args.tokenId, args.endBaton);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);
/**
* Send some SLP token amount to a given cash address
*
* slpSendRequest SlpSendRequest place an SLP send request
* returns SlpSendResponse
* */
const slpSend = ({ slpSendRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(sendRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }
      let resp = await wallet.send(sendRequest.to);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);
/**
* Send all available SLP funds to a given address
*
* slpSendMaxRequest SlpSendMaxRequest Request to send all available SLP funds to a given address
* returns SlpSendResponse
* */
const slpSendMax = ({ slpSendMaxRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(sendMaxRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }
      let resp = await wallet.sendMax(sendMaxRequest.cashaddr, sendMaxRequest.ticker, sendMaxRequest.tokenId);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);
/**
* Get detailed information about unspent SLP outputs (utxos)
*
* serializedWallet SerializedWallet Request detailed list of unspent SLP transaction outputs 
* returns SlpUtxoResponse
* */
const slpUtxos = ({ serializedWallet }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(serializedWallet.walletId);
      let args = serializedWallet;
      delete args.walletId;
      let resp = await wallet.getUtxos(args);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);

module.exports = {
  slpBalance,
  slpDepositAddress,
  slpDepositQr,
  slpGenesis,
  slpMint,
  slpSend,
  slpSendMax,
  slpUtxos,
};
