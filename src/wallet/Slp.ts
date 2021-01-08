import { Wallet } from "../wallet/Wif";
import bchaddr from "bchaddrjs-slp";
import {
  SlpGenesisOptions,
  SlpGenesisResult,
  SlpMintResult,
  SlpSendRequest,
  SlpSendResult,
  SlpTokenBalance,
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
import { SlpProvider } from "../slp/SlpProvider";

export class Slp {
  cashaddr: string;
  readonly wallet: Wallet;
  public provider: SlpProvider;

  constructor(wallet: Wallet) {
    this.cashaddr = bchaddr.toSlpAddress(wallet.cashaddr!);
    this.wallet = wallet;
    this.provider = new SlpDbProvider(this.wallet.networkType);
  }

  public getDepositAddress() {
    return this.cashaddr;
  }

  public getDepositQr(): ImageI {
    return qrAddress(this.cashaddr as string);
  }

  public async getSlpUtxos(cashaddr: string): Promise<SlpUtxoI[]> {
    return this.provider.SlpUtxos(bchaddr.toSlpAddress(cashaddr));
  }

  public async getBatonUtxos(
    ticker?: string,
    tokenId?: string
  ): Promise<SlpUtxoI[]> {
    return this.provider.SlpBatonUtxos(this.cashaddr, ticker, tokenId);
  }

  // gets transaction history of this wallet
  public async getHistory(ticker?: string, tokenId?: string): Promise<TxI[]> {
    return this.provider.SlpAddressTransactionHistory(
      this.cashaddr,
      ticker,
      tokenId
    );
  }

  // gets last transaction of this wallet
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

  // gets wallet balances, optionally reduced to only tokens with certain ticker and tokenId
  public async getBalance(
    ticker?: string,
    tokenId?: string
  ): Promise<SlpTokenBalance[]> {
    return this.provider.SlpAddressTokenBalances(
      this.cashaddr,
      ticker,
      tokenId
    );
  }

  // sets up a callback to be called upon wallet's balance change
  // can be cancelled by calling the function returned from this one
  public watchBalance(
    callback: (balance: SlpTokenBalance[]) => boolean | void,
    ticker?: string,
    tokenId?: string
  ): () => void {
    return this.provider.SlpWatchBalance(
      callback,
      this.cashaddr,
      ticker,
      tokenId
    );
  }

  // waits for address balance to be greater than or equal to the target value
  // this call halts the execution
  public async waitForBalance(
    value: BigNumber.Value,
    ticker: string,
    tokenId?: string
  ): Promise<SlpTokenBalance> {
    return this.provider.SlpWaitForBalance(
      value,
      this.cashaddr,
      ticker,
      tokenId
    );
  }

  // waits for next transaction, program execution is halted
  public async waitForTransaction(
    ticker?: string,
    tokenId?: string
  ): Promise<any> {
    return this.provider.SlpWaitForTransaction(this.cashaddr, ticker, tokenId);
  }

  public async genesis(options: SlpGenesisOptions): Promise<SlpGenesisResult> {
    let result = await this._processGenesis(options);
    return {
      tokenId: result,
      balances: (await this.getBalance(undefined, result)) as SlpTokenBalance[],
    };
  }

  private async _processGenesis(options: SlpGenesisOptions) {
    let slpOutputsResult = await SlpGetGenesisOutputs(
      options,
      this.cashaddr,
      this.cashaddr
    );

    const fundingBchUtxos = await this.wallet
      .slpAware(true)
      .getAddressUtxos(this.wallet.cashaddr!);

    return await this.processSlpTransaction(fundingBchUtxos, slpOutputsResult);
  }

  public async send(requests: SlpSendRequest[]): Promise<SlpSendResult> {
    let [actualTokenId, result] = await this._processSendRequests(requests);
    return {
      txId: result!,
      balances: (await this.getBalance(
        undefined,
        actualTokenId
      )) as SlpTokenBalance[],
    };
  }

  /**
   * _processSendRequests given a list of sendRequests, estimate fees, build the transaction and submit it.
   * @param  {SlpSendRequest[]} sendRequests
   */
  private async _processSendRequests(sendRequests: SlpSendRequest[]) {
    if (!sendRequests.length) {
      throw Error("Empty send requests");
    }
    const uniqueTickers = new Set(
      sendRequests.map((request) => request.ticker)
    );
    if (uniqueTickers.size > 1) {
      throw Error("Can not send different token types in one transaction");
    }
    const uniqueTockenIds = new Set(sendRequests.map((val) => val.tokenId));
    if (uniqueTockenIds.size > 1) {
      throw Error(
        "You have two different token types with the same ticker. Pass tokenId parameter"
      );
    }

    const ticker = sendRequests[0].ticker;
    const tokenId = sendRequests[0].tokenId;

    const slpUtxos = await this.provider.SlpSpendableUtxos(
      this.cashaddr,
      ticker,
      tokenId
    );
    let slpOutputsResult = await SlpGetSendOutputs(slpUtxos, sendRequests);

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

  public async mint(
    amount: BigNumber.Value,
    ticker: string,
    tokenId?: string,
    endBaton: boolean = false
  ): Promise<SlpMintResult> {
    let [actualTokenId, result] = await this._processMint(
      amount,
      ticker,
      tokenId,
      endBaton
    );
    return {
      txId: result,
      balances: (await this.getBalance(
        ticker,
        actualTokenId
      )) as SlpTokenBalance[],
    };
  }

  private async _processMint(
    amount: BigNumber.Value,
    ticker: string,
    tokenId?: string,
    endBaton: boolean = false
  ) {
    amount = new BigNumber(amount);
    if (amount.isLessThanOrEqualTo(0)) {
      throw Error("Mint amount should be greater than zero");
    }

    const slpBatonUtxos = await this.getBatonUtxos(ticker, tokenId);
    if (!slpBatonUtxos.length) {
      throw Error(`You do not posses the minting baton for ${ticker}`);
    }

    if (slpBatonUtxos.length > 1) {
      throw Error(
        "More than 1 minting baton found. Refusing to continue. Pass the tokenId parameter to be specific"
      );
    }

    tokenId = slpBatonUtxos[0].tokenId;

    let slpOutputsResult = await SlpGetMintOutputs(
      slpBatonUtxos,
      tokenId,
      amount,
      this.cashaddr,
      this.cashaddr,
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
    return await this._submitTransaction(encodedTransaction);
  }

  // Submit a raw transaction
  private async _submitTransaction(transaction: Uint8Array): Promise<string> {
    let rawTransaction = binToHex(transaction);
    return await this.wallet.provider!.sendRawTransaction(rawTransaction);
  }
}
