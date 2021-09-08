/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* Get total balance for wallet
*
* balanceRequest BalanceRequest Request for a wallet balance 
* returns BalanceResponse
* */
const smartbchBalance = ({ balanceRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(balanceRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }

      // the balance unit may also be empty
      const resp = await wallet.getBalance(balanceRequest.unit);
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
* walletRequest WalletRequest Request a new random wallet
* returns WalletResponse
* */
const smartbchCreateWallet = ({ walletRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const resp = await mainnet.SmartBch.createWalletResponse({ ...walletRequest });
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
const smartbchDepositAddress = ({ serializedWallet }) =>
  new Promise(async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(serializedWallet.walletId);
      const args = serializedWallet;
      delete args.walletId;
      const resp = await wallet.getDepositAddress(args);
      resolve(Service.successResponse( { address: resp } ));
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
const smartbchDepositQr = ({ serializedWallet }) =>
  new Promise(async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(serializedWallet.walletId);
      const args = serializedWallet;
      delete args.walletId;
      const resp = await wallet.getDepositQr(args);
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
* smartBchMaxAmountToSendRequest SmartBchMaxAmountToSendRequest get amount that will be spend with a spend max request. If a unit type is specified, a numeric value will be returned.
* returns BalanceResponse
* */
const smartbchMaxAmountToSend = ({ smartBchMaxAmountToSendRequest }) =>
  new Promise(async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchMaxAmountToSendRequest.walletId);
      const args = smartBchMaxAmountToSendRequest;
      delete args.walletId;
      const resp = await wallet.getMaxAmountToSend(args);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  })
/**
* Send some amount to a given address
*
* smartBchSendRequest SmartBchSendRequest place a send request
* returns SmartBchSendResponse
* */
const smartbchSend = ({ smartBchSendRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchSendRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }

      const resp = await wallet.send(smartBchSendRequest.to, smartBchSendRequest.options, smartBchSendRequest.overrides);
      resolve(Service.successResponse( resp ));
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
* smartBchSendMaxRequest SmartBchSendMaxRequest Request to send all available funds to a given address
* returns SmartBchSendMaxResponse
* */
const smartbchSendMax = ({ smartBchSendMaxRequest }) =>
  new Promise(async (resolve, reject) => {
    try {
      const wallet = await mainnet.SmartBch.walletFromId(smartBchSendMaxRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }

      const resp = await wallet.sendMax(smartBchSendMaxRequest.address, smartBchSendMaxRequest.options, smartBchSendMaxRequest.overrides);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  });

/**
* Returns the message signature
*
* createSignedMessageRequest CreateSignedMessageRequest Sign a message  (optional)
* returns SignedMessageResponse
* */
const smartbchSignedMessageSign = ({ createSignedMessageRequest }) => 
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await mainnet.SmartBch.walletFromId(createSignedMessageRequest.walletId);
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
* Returns a boolean indicating whether message was valid for a given address
*
* verifySignedMessageRequest VerifySignedMessageRequest Sign a message  (optional)
* returns VerifySignedMessageResponse
* */
const smartbchSignedMessageVerify = ({ verifySignedMessageRequest }) => 
  new Promise(async (resolve, reject) => {
    try {
      let args = verifySignedMessageRequest
      let resp, wallet
      wallet = await mainnet.SmartBch.walletFromId(args.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }
      resp = await wallet.verify(args.message, args.signature);
      resolve(Service.successResponse({... resp}));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  });

module.exports = {
  smartbchBalance,
  smartbchCreateWallet,
  smartbchDepositAddress,
  smartbchDepositQr,
  smartbchMaxAmountToSend,
  smartbchSend,
  smartbchSendMax,
  smartbchSignedMessageSign,
  smartbchSignedMessageVerify,
};
