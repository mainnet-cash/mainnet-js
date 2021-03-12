/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* Get total balance for wallet
*
* balanceRequest BalanceRequest Request for a wallet balance 
* returns BalanceResponse
* */
const balance = ({ balanceRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(balanceRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }

      // the balance unit may also be empty
      let resp = await wallet.getBalance(balanceRequest.unit);
      if (typeof resp === "number") {
        resolve(Service.successResponse(resp.toString()));
      } else {
        resolve(Service.successResponse(resp));
      }
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);
/**
* create a new wallet
*
* walletRequest WalletRequest Request a new new random wallet
* returns WalletResponse
* */
const createWallet = ({ walletRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let resp = await mainnet.createWalletResponse(walletRequest);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);
/**
* Get a deposit address in cash address format
*
* serializedWallet SerializedWallet Request for a deposit address given a wallet 
* returns DepositAddressResponse
* */
const depositAddress = ({ serializedWallet }) =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(serializedWallet.walletId);
      let args = serializedWallet;
      delete args.walletId;
      let resp = await wallet.getDepositAddress(args);
      resp = {cashaddr:resp}
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  });
/**
* Get receiving cash address as a qrcode
*
* serializedWallet SerializedWallet Request for a deposit cash address as a Quick Response code (qrcode) 
* returns ScalableVectorGraphic
* */
const depositQr = ({ serializedWallet }) =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(serializedWallet.walletId);
      let args = serializedWallet;
      delete args.walletId;
      let resp = await wallet.getDepositQr(args);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  });
/**
* Get wallet info
*
* serializedWallet SerializedWallet Request for a deposit cash address as a Quick Response code (qrcode) 
* returns WalletInfo
* */
const info = ({ serializedWallet }) =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(serializedWallet.walletId);
      let resp = await wallet.getInfo();
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  });  
/**
* Get maximum spendable amount
*
* maxAmountToSendRequest MaxAmountToSendRequest get amount that will be spend with a spend max request. If a unit type is specified, a numeric value will be returned.
* returns BalanceResponse
* */
const maxAmountToSend = ({ maxAmountToSendRequest }) => new 
 Promise(async (resolve, reject) => {
  try {
    let wallet = await mainnet.walletFromId(maxAmountToSendRequest.walletId);
    let args = maxAmountToSendRequest;
    delete args.walletId;
    let resp = await wallet.getMaxAmountToSend(args);
    resolve(Service.successResponse({ ...resp }));
  } catch (e) {
    reject(
      Service.rejectResponse(e, e.status || 500)
    );
  }
});
/**
* Send some amount to a given address
*
* uNKNOWNUnderscoreBASEUnderscoreTYPE UNKNOWN_BASE_TYPE place a send request
* returns SendResponse
* */
const send = ({ sendRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(sendRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }
      let resp = await wallet.send(sendRequest.to, sendRequest.options);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);
/**
* Send all available funds to a given address
*
* sendMaxRequest SendMaxRequest Request to all available funds to a given address
* returns SendMaxResponse
* */
const sendMax = ({ sendMaxRequest }) =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(sendMaxRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }
      let cashaddr = sendMaxRequest.cashaddr;
      let options = sendMaxRequest.options;
      let resp = await wallet.sendMax(cashaddr, options);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  });
/**
* Sign a message string
*
* createSignedMessageRequest CreateSignedMessageRequest Request sign a message string using a private key
* returns SignedMessageResponse
* */
const signedMessageSign = ({ createSignedMessageRequest }) =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(createSignedMessageRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }
      let args = createSignedMessageRequest;
      delete args.walletId;
      let msg = args.message;
      let resp = await wallet.sign(msg);
      resolve(Service.successResponse({ ... resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  });
  /**
* Verify a signed a message signature
*
* verifySignedMessageRequest VerifySignedMessageRequest Request sign a message string using a private key
* returns SignedMessageResponse
* */
const signedMessageVerify = ({ verifySignedMessageRequest }) =>
new Promise(async (resolve, reject) => {
  try {
    let args = verifySignedMessageRequest
    let wallet = await mainnet.walletFromId(args.walletId);
    if (!wallet) {
      throw Error("Could not derive wallet");
    }
    let resp = await wallet.verify(args.message, args.signature);
    resolve(Service.successResponse({... resp}));
  } catch (e) {
    reject(
      Service.rejectResponse(e, e.status || 500)
    );
  }
});
/**
* Get detailed information about unspent outputs (utxos)
*
* serializedWallet SerializedWallet Request detailed list of unspent transaction outputs 
* returns UtxoResponse
* */
const utxos = ({ serializedWallet }) => new Promise(
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
  balance,
  createWallet,
  depositAddress,
  depositQr,
  info,
  maxAmountToSend,
  send,
  sendMax,
  signedMessageSign,
  signedMessageVerify,
  utxos,
};
