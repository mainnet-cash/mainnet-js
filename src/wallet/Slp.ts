import { Wallet } from "../wallet/Wif";
import bchaddr from "bchaddrjs-slp";
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
import { SlpProvider, SlpWatchBalanceCallback } from "../slp/SlpProvider";

export class Slp {
  slpaddr: string;
  readonly wallet: Wallet;
  public provider: SlpProvider;

  constructor(wallet: Wallet) {
    this.slpaddr = bchaddr.toSlpAddress(wallet.cashaddr!);
    this.wallet = wallet;
    this.provider = new SlpDbProvider(this.wallet.networkType);
  }

  public getDepositAddress() {
    return this.slpaddr;
  }

  public getDepositQr(): ImageI {
    return qrAddress(this.slpaddr);
  }

  public getTokenInfo(tokenId: string): Promise<SlpTokenInfo | undefined> {
    return this.provider.SlpTokenInfo(tokenId);
  }

  public async getSlpUtxos(slpaddr: string): Promise<SlpUtxoI[]> {
    return this.provider.SlpUtxos(bchaddr.toSlpAddress(slpaddr));
  }

  public async getFormattedSlpUtxos(
    slpaddr: string
  ): Promise<SlpFormattedUtxo[]> {
    const utxos = await this.getSlpUtxos(bchaddr.toSlpAddress(slpaddr));
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

  public async getBatonUtxos(tokenId?: string): Promise<SlpUtxoI[]> {
    return this.provider.SlpBatonUtxos(this.slpaddr, tokenId);
  }

  // gets transaction history of this wallet
  public async getHistory(tokenId?: string): Promise<TxI[]> {
    return this.provider.SlpAddressTransactionHistory(this.slpaddr, tokenId);
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

  // get wallet token balance
  public async getBalance(tokenId: string): Promise<SlpTokenBalance> {
    return this.provider.SlpTokenBalance(this.slpaddr, tokenId);
  }

  // get all token balances of this wallet
  public async getAllBalances(): Promise<SlpTokenBalance[]> {
    return this.provider.SlpAllTokenBalances(this.slpaddr);
  }

  // sets up a callback to be called upon wallet's balance change
  // can be cancelled by calling the function returned from this one
  public watchBalance(
    callback: SlpWatchBalanceCallback,
    tokenId?: string
  ): () => void {
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

  public async send(requests: SlpSendRequest[]): Promise<SlpSendResponse> {
    let [actualTokenId, result] = await this._processSendRequests(requests);
    return {
      txId: result,
      balance: await this.getBalance(actualTokenId),
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
    const uniqueTockenIds = new Set(sendRequests.map((val) => val.tokenId));
    if (uniqueTockenIds.size > 1) {
      throw Error(
        "You have two different token types with the same ticker. Pass tokenId parameter"
      );
    }

    const tokenId = sendRequests[0].tokenId;

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

  // Submit a raw transaction
  private async _submitTransaction(transaction: Uint8Array): Promise<string> {
    let rawTransaction = binToHex(transaction);
    return this.wallet.provider!.sendRawTransaction(rawTransaction);
  }
}
