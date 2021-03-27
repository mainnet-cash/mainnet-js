/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* Get all slp balances of the wallet
*
* slpBalanceRequest SlpBalanceRequest Request for a wallet slp balances 
* returns List
* */
const slpAllBalances = ({ serializedWallet }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(serializedWallet.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }

      let resp = await wallet.slp.getAllBalances(serializedWallet.tokenId);
      resolve(Service.successResponse(resp));
    } catch (e) {
      console.log(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }

  },
);

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

      let resp = await wallet.slp.getBalance(slpBalanceRequest.tokenId);
      resolve(Service.successResponse(resp));
    } catch (e) {
      console.log(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
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
      resp = {slpaddr: resp}
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
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
      console.log(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
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
      let wallet = await mainnet.walletFromId(slpGenesisRequest.walletId);
      let args = slpGenesisRequest;
      delete args.walletId;
      let resp = await wallet.slp.genesis(args);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(e)
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get created tokenId back and new NFT token balance of the wallet
*
* slpGenesisRequest SlpGenesisRequest Request to create a new NFT parent token (genesis) 
* returns SlpGenesisResponse
* */
const nftParentGenesis = ({ slpGenesisRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(slpGenesisRequest.walletId);
      let args = slpGenesisRequest;
      delete args.walletId;
      let resp = await wallet.slp.nftParentGenesis(args);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(e)
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get created tokenId back and new NFT child token balance of the wallet
*
* slpGenesisRequest SlpGenesisRequest Request to create a new NFT child token (genesis) by consuming a parent token 
* returns SlpGenesisResponse
* */
const nftChildGenesis = ({ slpGenesisRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(slpGenesisRequest.walletId);
      let args = slpGenesisRequest;
      delete args.walletId;
      let resp = await wallet.slp.nftChildGenesis(args.parentTokenId, args);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(e)
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
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
      let wallet = await mainnet.walletFromId(slpMintRequest.walletId);
      let args = slpMintRequest;
      delete args.walletId;
      let resp = await wallet.slp.mint(args);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
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
      let wallet = await mainnet.walletFromId(slpSendRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }
      let resp = await wallet.slp.send(slpSendRequest.to);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
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
      let wallet = await mainnet.walletFromId(slpSendMaxRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }
      let resp = await wallet.slp.sendMax(slpSendMaxRequest.slpaddr, slpSendMaxRequest.tokenId);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      console.log(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get information about the token
*
* slpTokenInfoRequest SlpTokenInfoRequest Request to get information about the token 
* returns List
* */
const slpTokenInfo = ({ slpTokenInfoRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(slpTokenInfoRequest.walletId);
      const info = await wallet.slp.getTokenInfo(slpTokenInfoRequest.tokenId);
      resolve(Service.successResponse(info));
    } catch (e) {
      console.log(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
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
      console.log(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  slpAllBalances,
  slpBalance,
  slpDepositAddress,
  slpDepositQr,
  slpGenesis,
  nftParentGenesis,
  nftChildGenesis,
  slpMint,
  slpSend,
  slpSendMax,
  slpTokenInfo,
  slpUtxos,
};