/* eslint-disable no-unused-vars */
import Service from './Service.js';
import * as mainnet from "mainnet-js";

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

      if (balanceRequest.slpAware) {
        wallet.slpAware();
      }

      if (balanceRequest.slpSemiAware) {
        wallet.slpSemiAware();
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
* Get a token aware deposit address in cash address format
*
* serializedWallet SerializedWallet Request for a token aware deposit address given a wallet 
* returns DepositAddressResponse
* */
const tokenDepositAddress = ({ serializedWallet }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.walletFromId(serializedWallet.walletId);
      const address = await wallet.getTokenDepositAddress();
      resolve(Service.successResponse({ cashaddr: address }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
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
* Get receiving token aware cash address as a qrcode
*
* serializedWallet SerializedWallet Request for a token aware deposit cash address as a Quick Response code (qrcode) 
* returns ScalableVectorGraphic
* */
const tokenDepositQr = ({ serializedWallet }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(serializedWallet.walletId);
      let args = serializedWallet;
      delete args.walletId;
      let resp = await wallet.getTokenDepositQr(args);
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

/**
* Get wallet history
*
* historyRequest HistoryRequest Request a simplified wallet
* returns HistoryResponse
* */
const getHistory = ({ historyRequest }) =>
new Promise(async (resolve, reject) => {
  try {
    let wallet = await mainnet.walletFromId(historyRequest.walletId);
    let args = historyRequest;
    delete args.walletId;
    let resp = await wallet.getHistory(args.unit, args.start, args.count, args.collapseChange);
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
* Check if a named wallet already exists
*
* walletNamedExistsRequest WalletNamedExistsRequest Request parameters
* returns Boolean
* */
const namedExists = ({ walletNamedExistsRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let resp = await mainnet.namedWalletExists(walletNamedExistsRequest);
      resolve(Service.successResponse({ result: resp }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Replace (recover) named wallet with a new walletId. If wallet with a provided name does not exist yet, it will be created with a `walletId` supplied If wallet exists it will be overwritten without exception 
*
* walletReplaceNamedRequest WalletReplaceNamedRequest Request parameters
* returns Boolean
* */
const replaceNamed = ({ walletReplaceNamedRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const resp = await mainnet.replaceNamedWallet(walletReplaceNamedRequest);
      resolve(Service.successResponse({ result: true }));
    } catch (e) {
      console.log(e);
      resolve(Service.successResponse({ result: false }));
    }
  },
);
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
* Encode and sign a transaction given a list of sendRequests, options and estimate fees
*
* sendRequest SendRequest encode a transaction
* returns EncodeTransactionResponse
* */
const encodeTransaction = ( { encodeTransactionRequest } ) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.walletFromId(encodeTransactionRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }

      const { encodedTransaction } = await wallet.encodeTransaction(encodeTransactionRequest.to, encodeTransactionRequest.discardChange, encodeTransactionRequest.options);
      const txHex = mainnet.Mainnet.binToHex(encodedTransaction)
      resolve(Service.successResponse({ transactionHex: txHex }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);
/**
* submit an encoded and signed transaction to the network
*
* submitTransactionRequest SubmitTransactionRequest submit an encoded and signed transaction to the network
* returns SubmitTransactionResponse
* */
const submitTransaction = ({ submitTransactionRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.walletFromId(submitTransactionRequest.walletId);

      const encodedTransaction = mainnet.Mainnet.hexToBin(submitTransactionRequest.transactionHex)
      const txId = await wallet.submitTransaction(encodedTransaction, submitTransactionRequest.awaitPropagation);
      resolve(Service.successResponse({ txId: txId }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);

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

/**
* Get xpubkey paths for a given wallet
*
* xPubKeyRequest XPubKeyRequest Request detailed list of unspent transaction outputs 
* returns xPubKeyResponse
* */
const xpubkeys = ({ xPubKeyRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(xPubKeyRequest.walletId);
      let resp = await wallet.getXPubKeys(xPubKeyRequest.paths);

      resolve(Service.successResponse({ xpubkeys: resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);
/**
* Perform an explicit token burn
*
* tokenBurnRequest TokenBurnRequest Perform an explicit token burning by spending a token utxo to an OP_RETURN Behaves differently for fungible and non-fungible tokens:  * NFTs are always \"destroyed\"  * FTs' amount is reduced by the amount specified, if 0 FT amount is left and no NFT present, the token is \"destroyed\" Refer to spec https://github.com/bitjson/cashtokens 
* returns SendResponse
* */
const tokenBurn = ({ tokenBurnRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.walletFromId(tokenBurnRequest.walletId);
      const resp = await wallet.tokenBurn(tokenBurnRequest, tokenBurnRequest.message);

      resolve(Service.successResponse(resp));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Create new token category
*
* tokenGenesisRequest TokenGenesisRequest Create new cashtoken, both funglible and/or non-fungible (NFT) Refer to spec https://github.com/bitjson/cashtokens Newly created token identifier can be found in `tokenIds` field. 
* returns SendResponse
* */
const tokenGenesis = ({ tokenGenesisRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.walletFromId(tokenGenesisRequest.walletId);
      const resp = await wallet.tokenGenesis(tokenGenesisRequest, tokenGenesisRequest.sendRequests);

      resolve(Service.successResponse(resp));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Mint new non-fungible tokens
*
* tokenMintRequest TokenMintRequest Mint new NFT cashtokens using an existing minting token Refer to spec https://github.com/bitjson/cashtokens Newly minted tokens will retain the parent's `tokenId`. 
* returns SendResponse
* */
const tokenMint = ({ tokenMintRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.walletFromId(tokenMintRequest.walletId);
      const resp = await wallet.tokenMint(tokenMintRequest.tokenId, tokenMintRequest.requests, tokenMintRequest.deductTokenAmount);

      resolve(Service.successResponse(resp));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get non-fungible token balance
*
* getTokenBalanceRequest GetTokenBalanceRequest Gets non-fungible token (NFT) balance for a particula tokenId disregards fungible token balances for fungible token balance see @ref getTokenBalance 
* returns getNftTokenBalance_200_response
* */
const getNftTokenBalance = ({ getTokenBalanceRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.walletFromId(getTokenBalanceRequest.walletId);
      const resp = await wallet.getNftTokenBalance(getTokenBalanceRequest.tokenId);

      resolve(Service.successResponse({ balance: resp }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get fungible token balance
*
* getTokenBalanceRequest GetTokenBalanceRequest Gets fungible token balance for NFT token balance see @ref getNftTokenBalance 
* returns getTokenBalance_200_response
* */
const getTokenBalance = ({ getTokenBalanceRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.walletFromId(getTokenBalanceRequest.walletId);
      const resp = await wallet.getTokenBalance(getTokenBalanceRequest.tokenId);

      resolve(Service.successResponse({ balance: resp }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get token utxos
*
* getTokenUtxosRequest GetTokenUtxosRequest Get unspent token outputs for the wallet will return utxos only for the specified token if `tokenId` provided 
* returns UtxoResponse
* */
const getTokenUtxos = ({ getTokenUtxosRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.walletFromId(getTokenUtxosRequest.walletId);
      const resp = await wallet.getTokenUtxos(getTokenUtxosRequest.tokenId);

      resolve(Service.successResponse({ utxos: resp }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get non-fungible token balance
*
* getAllTokenBalancesRequest GetAllTokenBalancesRequest Gets all non-fungible token (NFT) balances in this wallet 
* returns Map
* */
const getAllNftTokenBalances = ({ getAllTokenBalancesRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.walletFromId(getAllTokenBalancesRequest.walletId);
      const resp = await wallet.getAllNftTokenBalances();

      resolve(Service.successResponse(resp));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get non-fungible token balance
*
* getAllTokenBalancesRequest GetAllTokenBalancesRequest Gets all fungible token balances in this wallet 
* returns Map
* */
const getAllTokenBalances = ({ getAllTokenBalancesRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const wallet = await mainnet.walletFromId(getAllTokenBalancesRequest.walletId);
      const resp = await wallet.getAllTokenBalances();

      resolve(Service.successResponse(resp));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

export default {
  balance,
  createWallet,
  depositAddress,
  tokenDepositAddress,
  depositQr,
  tokenDepositQr,
  getHistory,
  info,
  namedExists,
  replaceNamed,
  maxAmountToSend,
  send,
  sendMax,
  encodeTransaction,
  submitTransaction,
  utxos,
  xpubkeys,
  tokenGenesis,
  tokenMint,
  tokenBurn,
  getTokenBalance,
  getNftTokenBalance,
  getAllTokenBalances,
  getAllNftTokenBalances,
  getTokenUtxos
};
