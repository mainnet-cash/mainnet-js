import { Wallet } from "../wallet/Wif";
import {
  SlpFormattedUtxo,
  SlpGenesisOptions,
  SlpGenesisResult,
  SlpMintResult,
  SlpSendRequest,
  SlpSendResponse,
  SlpTokenBalance,
  SlpTokenInfo,
  SlpUtxoI,
} from "../slp/interface";
import { SlpDbProvider } from "../slp/SlpDbProvider";
import { ImageI } from "../qr/interface";
import { qrAddress } from "../qr/Qr";
import { TxI, UtxoI } from "../interface";
import { ElectrumRawTransaction } from "../network/interface";
import BigNumber from "bignumber.js";
import { getRelayFeeCache } from "../network/getRelayFeeCache";
import {
  buildEncodedTransaction,
  getFeeAmount,
  getSuitableUtxos,
} from "../transaction/Wif";
import {
  SlpGetGenesisOutputs,
  SlpGetMintOutputs,
  SlpGetSendOutputs,
} from "../slp/SlpLibAuth";
import { binToHex } from "@bitauth/libauth";
import { SendRequest } from "./model";
import {
  SlpCancelWatchFn,
  SlpProvider,
  SlpWatchBalanceCallback,
  SlpWatchTransactionCallback,
} from "../slp/SlpProvider";
import { toSlpAddress } from "../util/bchaddr";

/**
 * Class that class to manage an slp enabled wallet.
 */
export class Slp {
  slpaddr: string;
  readonly wallet: Wallet;
  public provider: SlpProvider;

  /**
   * Initializes an Slp Wallet.
   *
   * @param wallet     A non-slp wallet object
   */
  constructor(wallet: Wallet) {
    this.slpaddr = toSlpAddress(wallet.cashaddr!);
    this.wallet = wallet;
    this.provider = new SlpDbProvider(this.wallet.networkType);
  }

  /**
   * getDepositAddress - get the slp deposit address
   *
   * a high-level function,
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/wallet%2Fslp/slpDepositAddress|/wallet/slp/deposit_address} for REST endpoint
   *
   * @returns The the slp address as a string
   */
  public getDepositAddress() {
    return this.slpaddr;
  }

  /**
   * getDepositQr - get an slp address qrcode, encoded for display on the web
   *
   * a high-level function
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/wallet%2Fslp/slpDepositQr|/wallet/slp/deposit_qr} for REST endpoint
   *
   * @returns The qrcode for the slp address
   */
  public getDepositQr(): ImageI {
    const result = qrAddress(this.slpaddr);
    result.alt = "A Bitcoin Cash Simple Ledger Protocol QR Code";
    return result;
  }

  /**
   * getTokenInfo - get data associated with a token
   *
   * a high-level function
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/wallet%2Fslp/slpTokenInfo|/wallet/slp/token_info} for REST endpoint
   *
   * @param tokenId  The tokenId to request information about
   *
   * @returns Promise the slp token info or undefined.
   */
  public getTokenInfo(tokenId: string): Promise<SlpTokenInfo | undefined> {
    return this.provider.SlpTokenInfo(tokenId);
  }

  /**
   * getSlpUtxos - get a list of unspent outputs
   *
   * an intermediate function contributing to the output of wallet.getUtxos() and /wallet/utxos for slp enabled wallets
   *
   * @param slpaddr  The slpaddr to request slp unspent outputs for
   *
   * @returns Promise to a list of slp unspent outputs
   */
  public async getSlpUtxos(slpaddr: string): Promise<SlpUtxoI[]> {
    return this.provider.SlpUtxos(toSlpAddress(slpaddr));
  }

  /**
   * getFormattedSlpUtxos - get a list of unspent outputs
   *
   * an intermediate function
   *
   * @param slpaddr  The slpaddr to request slp formatted outputs
   *
   * @returns Promise to a list of slp formatted unspent outputs
   */
  public async getFormattedSlpUtxos(
    slpaddr?: string
  ): Promise<SlpFormattedUtxo[]> {
    if (!slpaddr) {
      slpaddr = this.slpaddr;
    }
    const utxos = await this.getSlpUtxos(toSlpAddress(slpaddr));
    return utxos.map((val) => {
      let utxo: any = {};
      utxo.ticker = val.ticker;
      utxo.tokenId = val.tokenId;
      utxo.value = val.value.toString();
      utxo.satoshis = val.satoshis;
      utxo.decimals = val.decimals;
      utxo.txId = val.txid;
      utxo.index = val.vout;
      utxo.utxoId = utxo.txId + ":" + utxo.index;
      return utxo as SlpFormattedUtxo;
    });
  }

  /**
   * getBatonUtxos - get a list of baton unspent outputs
   *
   * an intermediate function
   *
   * @param tokenId   The id of the slp token
   *
   * @returns Promise to a list of slp unspent outputs
   */
  public async getBatonUtxos(tokenId?: string): Promise<SlpUtxoI[]> {
    return this.provider.SlpBatonUtxos(this.slpaddr, tokenId);
  }

  /**
   * getHistory - get a transaction history for a particular address
   *
   * an intermediate function
   *
   * @param tokenId   The id of the slp token
   *
   * @returns Promise to a list of transactions
   */
  public async getHistory(tokenId?: string): Promise<TxI[]> {
    return this.provider.SlpAddressTransactionHistory(this.slpaddr, tokenId);
  }

  /**
   * getLastTransaction - get a token balance for a particular address
   *
   * a high-level function, see also /wallet/slp/balance REST endpoint
   *
   * @param {boolean} [confirmedOnly=false]  When confirmedOnly is true, results will be limited to only transactions included in a block.
   *
   * @returns Promise to the transaction hex or error
   */
  public async getLastTransaction(
    confirmedOnly: boolean = false
  ): Promise<ElectrumRawTransaction> {
    let history: TxI[] = await this.getHistory();
    if (confirmedOnly) {
      history = history.filter((val) => val.height > 0);
    }
    const [lastTx] = history.slice(-1);
    return this.wallet.provider!.getRawTransactionObject(lastTx.tx_hash);
  }

  /**
   * getBalance - get a token balance for a particular address
   *
   * a high-level function, see also /wallet/slp/balance REST endpoint
   *
   * @param tokenId   The id of the slp token
   *
   * @returns Promise to an SlpTokenBalance
   */
  public async getBalance(tokenId: string): Promise<SlpTokenBalance> {
    return this.provider.SlpTokenBalance(this.slpaddr, tokenId);
  }

  // get all token balances of this wallet
  public async getAllBalances(): Promise<SlpTokenBalance[]> {
    return this.provider.SlpAllTokenBalances(this.slpaddr);
  }

  // sets up a callback to be called upon wallet's slp balance change
  // can be cancelled by calling the function returned from this one
  public watchBalance(
    callback: SlpWatchBalanceCallback,
    tokenId?: string
  ): SlpCancelWatchFn {
    return this.provider.SlpWatchBalance(callback, this.slpaddr, tokenId);
  }

  // waits for address balance to be greater than or equal to the target value
  // this call halts the execution
  public async waitForBalance(
    value: BigNumber.Value,
    tokenId: string
  ): Promise<SlpTokenBalance> {
    return this.provider.SlpWaitForBalance(value, this.slpaddr, tokenId);
  }

  // sets up a callback to be called upon wallet's slp transactions occurring
  // can be cancelled by calling the function returned from this one
  public watchTransactions(
    callback: SlpWatchTransactionCallback,
    tokenId?: string
  ): SlpCancelWatchFn {
    return this.provider.SlpWatchTransactions(callback, this.slpaddr, tokenId);
  }

  // waits for next transaction, program execution is halted
  public async waitForTransaction(tokenId?: string): Promise<any> {
    return this.provider.SlpWaitForTransaction(this.slpaddr, tokenId);
  }

  public async genesis(options: SlpGenesisOptions): Promise<SlpGenesisResult> {
    let result = await this._processGenesis(options);
    return {
      tokenId: result,
      balance: await this.getBalance(result),
    };
  }

  private async _processGenesis(options: SlpGenesisOptions) {
    let slpOutputsResult = await SlpGetGenesisOutputs(
      options,
      this.slpaddr,
      this.slpaddr
    );

    const fundingBchUtxos = await this.wallet
      .slpAware(true)
      .getAddressUtxos(this.wallet.cashaddr!);

    return this.processSlpTransaction(fundingBchUtxos, slpOutputsResult);
  }

  /**
   * sendMax - send the maximum spendable amount for a token to an slpaddr.
   *
   * a high-level function, see also /wallet/slp/send_max REST endpoint
   *
   * @param slpaddr   destination address
   * @param tokenId   the id of the token to be spent
   *
   * @returns transaction id and token balance
   */
  public async sendMax(
    slpaddr: string,
    tokenId: string
  ): Promise<SlpSendResponse> {
    const balance = await this.getBalance(tokenId);
    const requests: SlpSendRequest[] = [balance].map((val) => ({
      slpaddr: slpaddr,
      value: val.value,
      ticker: val.ticker,
      tokenId: val.tokenId,
    }));
    return this.send(requests);
  }

  /**
   * send - attempt to process a list of slp send requests.
   *
   * a high-level function, see also /wallet/slp/send REST endpoint
   *
   * @param [requests]   list of send requests
   *
   * @returns transaction id and token balance
   */
  public async send(requests: SlpSendRequest[]): Promise<SlpSendResponse> {
    let [actualTokenId, result] = await this._processSendRequests(requests);
    return {
      txId: result,
      balance: await this.getBalance(actualTokenId),
    };
  }

  /**
   * _processSendRequests - given a list of sendRequests, estimate fees, build the transaction and submit it.
   *
   * A private utility wrapper to pre-process transactions
   *
   * Unstable - behavior may change without notice.
   *
   * @param  {SlpSendRequest[]} sendRequests
   */
  private async _processSendRequests(sendRequests: SlpSendRequest[]) {
    if (!sendRequests.length) {
      throw Error("Empty send requests");
    }
    if (sendRequests.length > 19) {
      throw Error("Too many send requests in one transaction");
    }
    const uniqueTockenIds = new Set(sendRequests.map((val) => val.tokenId));
    if (uniqueTockenIds.size > 1) {
      throw Error(
        "You have two different token types with the same ticker. Pass tokenId parameter"
      );
    }

    const tokenId = sendRequests[0].tokenId;
    if (!tokenId.match(/^[0-9a-fA-F]{64}$/)) {
      throw new Error(
        "Invalid tokenId, must be 64 characte long hexadecimal string"
      );
    }

    const slpUtxos = await this.provider.SlpSpendableUtxos(
      this.slpaddr,
      tokenId
    );
    let slpOutputsResult = await SlpGetSendOutputs(
      this.slpaddr,
      slpUtxos,
      sendRequests
    );

    let fundingBchUtxos = await this.wallet
      .slpAware(true)
      .getAddressUtxos(this.wallet.cashaddr!);
    let slpToBchUtxos = slpOutputsResult.FundingSlpUtxos.map(
      (val) => val as UtxoI
    );
    fundingBchUtxos = [...slpToBchUtxos, ...fundingBchUtxos];

    const actualTokenId = slpUtxos[0].tokenId;
    return [
      actualTokenId,
      await this.processSlpTransaction(fundingBchUtxos, slpOutputsResult),
    ];
  }

  /**
   * mint - attempt to process a list of slp send requests.
   *
   * a high-level function, see also /wallet/slp/mint endpoint
   *
   * @param value   amount to mint
   * @param tokenId   the tokenId of the slp being minted
   * @param endBaton   boolean indicating whether the token should continue to be "mintable"
   *
   * @returns transaction id and token balance
   */
  public async mint(
    value: BigNumber.Value,
    tokenId: string,
    endBaton: boolean = false
  ): Promise<SlpMintResult> {
    let [actualTokenId, result] = await this._processMint(
      value,
      tokenId,
      endBaton
    );
    return {
      txId: result,
      balance: await this.getBalance(actualTokenId),
    };
  }

  /**
   * _processMint - given mint parameters, prepare the transaction
   *
   * a private utility wrapper to pre-process transactions
   *
   * @param value   amount to mint
   * @param tokenId   the tokenId of the slp being minted
   * @param endBaton   boolean indicating whether the token should continue to be "mintable"
   *
   * @returns the tokenId and minting transaction id
   */
  private async _processMint(
    value: BigNumber.Value,
    tokenId: string,
    endBaton: boolean = false
  ) {
    value = new BigNumber(value);
    if (value.isLessThanOrEqualTo(0)) {
      throw Error("Mint amount should be greater than zero");
    }

    const slpBatonUtxos = await this.getBatonUtxos(tokenId);
    if (!slpBatonUtxos.length) {
      throw Error(`You do not posses the minting baton for ${tokenId}`);
    }

    let slpOutputsResult = await SlpGetMintOutputs(
      slpBatonUtxos,
      tokenId,
      value,
      this.slpaddr,
      this.slpaddr,
      endBaton
    );

    let bchUtxos = await this.wallet
      .slpAware(true)
      .getAddressUtxos(this.wallet.cashaddr!);
    let fundingBchUtxos = bchUtxos;
    let slpToBchUtxos = slpOutputsResult.FundingSlpUtxos.map(
      (val) => val as UtxoI
    );
    fundingBchUtxos = [...slpToBchUtxos, ...fundingBchUtxos];

    return [
      tokenId,
      await this.processSlpTransaction(fundingBchUtxos, slpOutputsResult),
    ];
  }

  private async processSlpTransaction(
    fundingBchUtxos: UtxoI[],
    slpOutputsResult: {
      SlpOutputs: { lockingBytecode: Uint8Array; satoshis: Uint8Array }[];
      FundingSlpUtxos: SlpUtxoI[];
      BchSendRequests: SendRequest[];
    }
  ): Promise<string> {
    if (!this.wallet.privateKey) {
      throw new Error(
        `Wallet ${this.wallet.name} is missing either a network or private key`
      );
    }

    if (!fundingBchUtxos.length) {
      throw new Error("No bch available to fund this transaction");
    }

    const bestHeight = await this.wallet.provider!.getBlockHeight()!;

    const relayFeePerByteInSatoshi = await getRelayFeeCache(
      this.wallet.provider!
    );

    const feeEstimate = await getFeeAmount({
      utxos: fundingBchUtxos,
      sendRequests: slpOutputsResult.BchSendRequests,
      privateKey: this.wallet.privateKey,
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      slpOutputs: slpOutputsResult.SlpOutputs,
    });

    const bchSpendAmount = slpOutputsResult.BchSendRequests.map(
      (val) => val.value
    ).reduce((a, b) => a + b, 0);

    let fundingUtxos = await getSuitableUtxos(
      fundingBchUtxos,
      BigInt(bchSpendAmount) + BigInt(feeEstimate),
      bestHeight
    );

    if (fundingUtxos.length === 0) {
      throw Error(
        "The available inputs couldn't satisfy the request with fees"
      );
    }

    const fee = await getFeeAmount({
      utxos: fundingUtxos,
      sendRequests: slpOutputsResult.BchSendRequests,
      privateKey: this.wallet.privateKey,
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      slpOutputs: slpOutputsResult.SlpOutputs,
    });

    const encodedTransaction = await buildEncodedTransaction(
      fundingUtxos,
      slpOutputsResult.BchSendRequests,
      this.wallet.privateKey,
      fee,
      false,
      slpOutputsResult.SlpOutputs
    );
    return this._submitTransaction(encodedTransaction);
  }

  /**
   * _submitTransaction - transform binary transaction to hex and submit it to the network provider
   *
   * a private utility wrapper submit raw transactions
   *
   * @param transaction   raw transaction
   *
   * @returns the transaction id of the broadcasted transaction
   */
  private async _submitTransaction(transaction: Uint8Array): Promise<string> {
    let rawTransaction = binToHex(transaction);
    return this.wallet.provider!.sendRawTransaction(rawTransaction);
  }
}
