import {
  Wallet,
  RegTestWallet,
  TestNetWallet,
  WifWallet,
  TestNetWifWallet,
  RegTestWifWallet,
  WatchWallet,
  TestNetWatchWallet,
  RegTestWatchWallet,
} from "../wallet/Wif.js";
import {
  SlpFormattedUtxo,
  SlpGenesisOptions,
  SlpGenesisResult,
  SlpMintOptions,
  SlpMintResult,
  SlpSendRequest,
  SlpSendResponse,
  SlpTokenBalance,
  SlpTokenInfo,
  SlpTokenType,
  SlpTxI,
  SlpUtxoI,
} from "../slp/interface.js";
import { SlpDbProvider } from "../slp/SlpDbProvider.js";
import { ImageI } from "../qr/interface.js";
import { qrAddress } from "../qr/Qr.js";
import { TxI, UtxoI } from "../interface.js";
import { ElectrumRawTransaction } from "../network/interface.js";
import BigNumber from "bignumber.js";
import { getRelayFeeCache } from "../network/getRelayFeeCache.js";
import {
  buildEncodedTransaction,
  getFeeAmount,
  getSuitableUtxos,
} from "../transaction/Wif.js";
import {
  SlpGetGenesisOutputs,
  SlpGetMintOutputs,
  SlpGetSendOutputs,
} from "../slp/SlpLibAuth.js";
import { binToHex, Output } from "@bitauth/libauth";
import { SendRequest } from "./model.js";
import {
  SlpCancelWatchFn,
  SlpProvider,
  SlpWatchBalanceCallback,
  SlpWatchTransactionCallback,
} from "../slp/SlpProvider.js";
import { toCashAddress, toSlpAddress } from "../util/bchaddr.js";
import { GsppProvider } from "../slp/GsppProvider.js";
import { delay } from "../util/delay.js";
import { Util } from "./Util.js";
import { FeePaidByEnum } from "./enum.js";
import {
  getRuntimePlatform,
  RuntimePlatform,
} from "../util/getRuntimePlatform.js";

/**
 * Class to manage an slp enabled wallet.
 */
export class Slp {
  slpaddr: string;
  readonly wallet: Wallet;
  public provider: SlpProvider;
  // a loookup table of spent inputs to keep track of NFT parent token consumption. related to a bug in SLPDB
  private spentParentUtxos: string[] = [];

  static get walletType() {
    return Wallet;
  }

  public static defaultProvider = "slpdb";

  /**
   * Initializes an Slp Wallet.
   *
   * @param wallet     A non-slp wallet object
   */
  constructor(wallet: Wallet) {
    this.slpaddr = toSlpAddress(wallet.cashaddr!);
    this.wallet = wallet;

    let provider = Slp.defaultProvider;
    if (
      getRuntimePlatform() === RuntimePlatform.node &&
      process.env.SLP_PROVIDER
    )
      provider = process.env.SLP_PROVIDER!;

    if (provider === "gspp") {
      this.provider = new GsppProvider(this.wallet.network);
    } else {
      // provider === "slpdb"
      this.provider = new SlpDbProvider(this.wallet.network);
    }
  }

  /**
   * setProvider - sets the provider to fetch slp data from
   */
  public setProvider(provider: SlpProvider) {
    return (this.provider = provider);
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
   * @returns Promise to the slp token info or undefined.
   */
  public getTokenInfo(tokenId: string): Promise<SlpTokenInfo | undefined> {
    return this.provider.SlpTokenInfo(tokenId);
  }

  /**
   * getSlpOutpoints - get a list of SLP unspent outpoints
   *
   * an intermediate function contributing to the output of wallet.getUtxos() and /wallet/utxos for slp enabled wallets
   *
   * @param slpaddr  The slpaddr to request slp unspent outpoints for
   *
   * @returns Promise to a list of slp unspent outpoints
   */
  public async getSlpOutpoints(): Promise<String[]> {
    return this.provider.SlpOutpoints(this.slpaddr);
  }

  /**
   * getSlpUtxos - get a list of SLP unspent outputs
   *
   * @returns Promise to a list of slp unspent outputs
   */
  public async getSlpUtxos(): Promise<SlpUtxoI[]> {
    return this.provider.SlpUtxos(this.slpaddr);
  }

  /**
   * getFormattedSlpUtxos - get a list of unspent outputs
   *
   * an intermediate function
   *
   * @returns Promise to a list of slp formatted unspent outputs
   */
  public async getFormattedSlpUtxos(): Promise<SlpFormattedUtxo[]> {
    const utxos = await this.getSlpUtxos();
    return utxos.map((val) => {
      let utxo = {} as SlpFormattedUtxo;
      utxo.ticker = val.ticker;
      utxo.tokenId = val.tokenId;
      utxo.value = val.value.toString();
      utxo.satoshis = val.satoshis;
      utxo.decimals = val.decimals;
      utxo.txId = val.txid;
      utxo.index = val.vout;
      utxo.utxoId = utxo.txId + ":" + utxo.index;
      utxo.type = val.type;
      return utxo;
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
  public async getHistory(tokenId?: string): Promise<SlpTxI[]> {
    return this.provider.SlpAddressTransactionHistory(this.slpaddr, tokenId);
  }

  /**
   * getLastTransaction - get a last SLP token transaction of a particular address
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
    if (!tokenId) {
      throw new Error(`Invalid tokenId ${tokenId}`);
    }
    return this.provider.SlpTokenBalance(this.slpaddr, tokenId);
  }

  /**
   * getAllBalances - get all token balances for a particular address
   *
   * a high-level function, see also /wallet/slp/all_balances REST endpoint
   *
   * @returns Promise to an array of SlpTokenBalance
   */
  public async getAllBalances(): Promise<SlpTokenBalance[]> {
    return this.provider.SlpAllTokenBalances(this.slpaddr);
  }

  /**
   * watchBalance - set up a callback to be called upon wallet's slp balance change
   *
   * can be cancelled by calling the function returned from this one
   *
   * @param callback   The callback function to be called each time the balance changes
   * @param tokenId    Specific token id to watch
   *
   * @returns A function to cancel the watching
   */
  public watchBalance(
    callback: SlpWatchBalanceCallback,
    tokenId: string
  ): SlpCancelWatchFn {
    return this.provider.SlpWatchBalance(callback, this.slpaddr, tokenId);
  }

  /**
   * waitForBalance - wait for address balance to be greater than or equal to the target value
   *
   * This call halts the program execution
   *
   * @param value      Target balance value
   * @param tokenId    Specific token id to watch
   *
   * @returns Actual token balance after reaching or surpassing the target value
   */
  public async waitForBalance(
    value: BigNumber.Value,
    tokenId: string
  ): Promise<SlpTokenBalance> {
    return this.provider.SlpWaitForBalance(value, this.slpaddr, tokenId);
  }

  /**
   * watchBalance - set up a callback to be called upon wallet's slp transactions occurring
   *
   * can be cancelled by calling the function returned from this one
   *
   * @param callback   The callback function to be called each time the balance changes
   * @param tokenId    Specific token id to watch, optional
   *
   * @returns A function to cancel the watching
   */
  public watchTransactions(
    callback: SlpWatchTransactionCallback,
    tokenId?: string
  ): SlpCancelWatchFn {
    return this.provider.SlpWatchTransactions(callback, this.slpaddr, tokenId);
  }

  /**
   * waitForBalance - wait for the next SLP transaction to occur
   *
   * This call halts the program execution
   *
   * @param tokenId    Specific token id to watch, optional
   *
   * @returns Transaction object
   */
  public async waitForTransaction(tokenId?: string): Promise<SlpTxI> {
    return this.provider.SlpWaitForTransaction(this.slpaddr, tokenId);
  }

  /**
   * genesis - create a new Type1 SLP token
   *
   * @param options    Token creation options @see SlpGenesisOptions
   *
   * @returns Token Id and new token balance
   */
  public async genesis(options: SlpGenesisOptions): Promise<SlpGenesisResult> {
    let result = await this._processGenesis(options);
    return {
      tokenId: result,
      balance: await this.getBalance(result),
    };
  }

  /**
   * nftParentGenesis - create a new NFT Parent token
   *
   * @param options    Token creation options @see SlpGenesisOptions
   *
   * @returns Token Id and new token balance
   */
  public async nftParentGenesis(
    options: SlpGenesisOptions
  ): Promise<SlpGenesisResult> {
    options.type = SlpTokenType.NftParent;
    let result = await this._processGenesis(options);
    return {
      tokenId: result,
      balance: await this.getBalance(result),
    };
  }

  /**
   * nftParentGenesis - create a new NFT Child token
   *
   * @param parentTokenId    Parent token id, at least one is required and will be spent in the child genesis process
   * @param options    Token creation options @see SlpGenesisOptions
   *
   * @returns Token Id and new token balance
   */
  public async nftChildGenesis(
    options: SlpGenesisOptions
  ): Promise<SlpGenesisResult> {
    if (!options.parentTokenId) {
      throw new Error(
        `The 'parentTokenId' was not set or invalid ${options.parentTokenId}`
      );
    }

    let parentUtxos = await this.provider.SlpSpendableUtxos(
      this.slpaddr,
      options.parentTokenId
    );

    parentUtxos = parentUtxos.filter(
      (val) => this.spentParentUtxos.indexOf(`${val.txid}:${val.vout}`) === -1
    );
    parentUtxos = parentUtxos.sort((a, b) => a.value.comparedTo(b.value));

    if (!parentUtxos.length) {
      throw new Error(
        `You do not own any NFT parent tokens with id ${options.parentTokenId}`
      );
    }

    if (parentUtxos[0].type !== SlpTokenType.NftParent) {
      throw new Error(
        `The 'parentTokenId' is not of type ${SlpTokenType.NftParent}`
      );
    }

    // we are about to spend exactly 1 NFT parent
    // if we do not have it, we have to make one by splitting
    if (parentUtxos[0].value.isGreaterThan(new BigNumber(1))) {
      await this.send([
        {
          slpaddr: this.slpaddr,
          tokenId: options.parentTokenId,
          value: new BigNumber(1),
        },
      ]);
      return await this.nftChildGenesis(options);
    }

    options.type = SlpTokenType.NftChild;
    options.endBaton = true;
    options.initialAmount = 1;
    options.decimals = 0;
    let result = await this._processGenesis(options, [parentUtxos[0]]);

    const tx = (await this.wallet.provider!.getRawTransactionObject(
      result
    )) as ElectrumRawTransaction;
    tx.vin.forEach((val) =>
      this.spentParentUtxos.push(`${val.txid}:${val.vout}`)
    );

    return {
      tokenId: result,
      balance: await this.getBalance(result),
    };
  }

  /**
   * _processGenesis - prepare the genesis transaction with given parameters
   *
   * a private utility wrapper to pre-process transactions
   *
   * @param options   genesis options to controll the process
   *
   * @returns the created tokenId (which is genesis transaction id) and token balance
   */
  private async _processGenesis(
    options: SlpGenesisOptions,
    ensureInputs: UtxoI[] = []
  ) {
    options = this.substituteOptionals(options);

    let slpOutputsResult = await SlpGetGenesisOutputs(options);

    let fundingBchUtxos = await this.wallet
      .slpAware(true)
      .getAddressUtxos(this.wallet.cashaddr!);

    fundingBchUtxos = [...ensureInputs, ...fundingBchUtxos];

    return this.processSlpTransaction(fundingBchUtxos, slpOutputsResult);
  }

  /**
   * sendMax - send the maximum spendable amount for a token to an slpaddr.
   *
   * a high-level function, see also /wallet/slp/send_max REST endpoint
   *
   * @param slpaddr   destination SLP address
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
   *  explorerUrl   Web url to a transaction on a block explorer
   *
   * @param txId   transaction Id
   * @returns   Url string
   */
  public explorerUrl(txId: string) {
    const explorerUrlMap = {
      mainnet: "https://simpleledger.info/#tx/",
      testnet: "https://testnet.simpleledger.info/#tx/",
      regtest: "",
    };

    return explorerUrlMap[this.wallet.network] + txId;
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
      explorerUrl: this.explorerUrl(result),
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
    const uniqueTokenIds = new Set(sendRequests.map((val) => val.tokenId));
    if (uniqueTokenIds.size > 1) {
      throw Error(
        "You have two different token types with the same ticker. Pass tokenId parameter"
      );
    }

    const tokenId = sendRequests[0].tokenId;
    if (!tokenId.match(/^[0-9a-fA-F]{64}$/)) {
      throw new Error(
        "Invalid tokenId, must be 64 character long hexadecimal string"
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
      await this.processSlpTransaction(
        fundingBchUtxos,
        slpOutputsResult,
        actualTokenId
      ),
    ];
  }

  /**
   * mint - create new tokens to increase the circulation supply.
   *
   * a high-level function, see also /wallet/slp/mint endpoint
   *
   * @param value   amount to mint
   * @param tokenId   the tokenId of the slp being minted
   * @param endBaton   boolean indicating whether the token should continue to be "mintable"
   *
   * @returns transaction id and token balance
   */
  public async mint(options: SlpMintOptions): Promise<SlpMintResult> {
    let [actualTokenId, result] = await this._processMint(options);
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
  private async _processMint(options: SlpMintOptions) {
    options = this.substituteOptionals(options);

    options.value = new BigNumber(options.value);
    if (
      options.value.isLessThanOrEqualTo(0) &&
      options.batonReceiverSlpAddr === this.slpaddr
    ) {
      throw Error("Mint amount should be greater than zero");
    }

    const slpBatonUtxos = await this.getBatonUtxos(options.tokenId);
    if (!slpBatonUtxos.length) {
      throw Error(
        `You do not possess the minting baton for ${options.tokenId}`
      );
    }

    let slpOutputsResult = await SlpGetMintOutputs(options, slpBatonUtxos);

    let bchUtxos = await this.wallet
      .slpAware(true)
      .getAddressUtxos(this.wallet.cashaddr!);
    let fundingBchUtxos = bchUtxos;
    let slpToBchUtxos = slpOutputsResult.FundingSlpUtxos.map(
      (val) => val as UtxoI
    );
    fundingBchUtxos = [...slpToBchUtxos, ...fundingBchUtxos];

    return [
      options.tokenId,
      await this.processSlpTransaction(
        fundingBchUtxos,
        slpOutputsResult,
        options.tokenId
      ),
    ];
  }

  /**
   * processSlpTransaction - process the prepared SLP transaction and submit it to the network
   *
   * @param fundingBchUtxos   ensure these BCH utxos to be spent in the process
   * @param slpOutputsResult  prepared SLP outputs to be added to transaction
   *
   * @returns the tokenId and minting transaction id
   */
  private async processSlpTransaction(
    fundingBchUtxos: UtxoI[],
    slpOutputsResult: {
      SlpOutputs: Output[];
      FundingSlpUtxos: SlpUtxoI[];
      BchSendRequests: SendRequest[];
    },
    tokenId?: string
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
      sourceAddress: this.wallet.cashaddr!,
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      slpOutputs: slpOutputsResult.SlpOutputs,
      feePaidBy: FeePaidByEnum.change,
    });

    const bchSpendAmount = slpOutputsResult.BchSendRequests.map(
      (val) => val.value
    ).reduce((a, b) => a + b, 0);

    let fundingUtxos = await getSuitableUtxos(
      fundingBchUtxos,
      BigInt(bchSpendAmount) + BigInt(feeEstimate),
      bestHeight,
      FeePaidByEnum.change,
      slpOutputsResult.BchSendRequests
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
      sourceAddress: this.wallet.cashaddr!,
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      slpOutputs: slpOutputsResult.SlpOutputs,
      feePaidBy: FeePaidByEnum.change,
    });

    const { encodedTransaction } = await buildEncodedTransaction({
      inputs: fundingUtxos,
      outputs: slpOutputsResult.BchSendRequests,
      signingKey: this.wallet.privateKey,
      sourceAddress: this.wallet.cashaddr!,
      fee,
      discardChange: false,
      slpOutputs: slpOutputsResult.SlpOutputs,
    });

    return this._submitTransaction(encodedTransaction, tokenId);
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
  private async _submitTransaction(
    transaction: Uint8Array,
    tokenId?: string
  ): Promise<string> {
    let rawTransaction = binToHex(transaction);

    const slpPromise = new Promise(async (resolve) => {
      const txHash = await Util.getTransactionHash(rawTransaction);

      const cancelWatchFn = this.provider.SlpWatchTransactions(
        async (tx: SlpTxI) => {
          if (tx.tx_hash === txHash) {
            cancelWatchFn();
            resolve(txHash);
          }
        },
        undefined,
        tokenId || txHash
      );
    });

    const bchPromise = this.wallet.provider!.sendRawTransaction(
      rawTransaction,
      true
    );

    const [_, txHash] = await Promise.all([slpPromise, bchPromise]);

    // allow for indexer processing, delay value is a bit arbitrary
    await delay(100);

    return txHash;
  }

  /**
   * substituteOptionals - substitute optional fields with default values
   *
   * will ensure that baton and token receiver are intialized as SLP address of this wallet if absent
   * will ensure that baton will not be ended if endBaton is undefined
   * a private utility wrapper substitute optionals
   *
   * @param options   genesis or mint options to substitute values int
   *
   * @returns options with relevant values substituted/initialized
   */
  private substituteOptionals(options: any): any {
    if (!options.batonReceiverSlpAddr) {
      options.batonReceiverSlpAddr = this.slpaddr;
    }
    if (!options.tokenReceiverSlpAddr) {
      options.tokenReceiverSlpAddr = this.slpaddr;
    }
    if (options.endBaton === undefined) {
      options.endBaton = false;
    }

    return options;
  }

  //#region Convenience methods to initialize Slp aware BCH wallet.

  /**
   * fromId - create an SLP aware wallet from encoded walletId string
   *
   * @param walletId   walletId options to steer the creation process
   *
   * @returns wallet instantiated accordingly to the walletId rules
   */
  public static async fromId(walletId: string): Promise<Wallet> {
    const wallet = await this.walletType.fromId(walletId);
    wallet._slpAware = true;
    return wallet;
  }

  /**
   * named - create an SLP aware named wallet
   *
   * @param name   user friendly wallet alias
   * @param dbName name under which the wallet will be stored in the database
   * @param force  force recreate wallet in the database if a record already exist
   *
   * @returns instantiated wallet
   */
  public static async named(
    name: string,
    dbName?: string,
    force?: boolean
  ): Promise<Wallet> {
    const wallet = await this.walletType.named(name, dbName, force);
    wallet.derivationPath = "m/44'/245'/0'/0/0";
    wallet._slpAware = true;
    return wallet;
  }

  /**
   * fromSeed - create an SLP aware wallet using the seed phrase and derivation path
   *
   * unless specified the derivation path m/44'/245'/0'/0/0 will be userd
   * this derivation path is standard for Electron Cash SLP and other SLP enabled wallets
   *
   * @param seed   BIP39 12 word seed phrase
   * @param derivationPath BIP44 HD wallet derivation path to get a single the private key from hierarchy
   *
   * @returns instantiated wallet
   */
  public static async fromSeed(
    seed: string,
    derivationPath: string = "m/44'/245'/0'/0/0"
  ): Promise<Wallet> {
    const wallet = await this.walletType.fromSeed(seed, derivationPath);
    wallet._slpAware = true;
    return wallet;
  }

  /**
   * newRandom - create an SLP aware random wallet
   *
   * if `name` parameter is specified, the wallet will also be persisted to DB
   *
   * @param name   user friendly wallet alias
   * @param dbName name under which the wallet will be stored in the database
   *
   * @returns instantiated wallet
   */
  public static async newRandom(
    name: string = "",
    dbName?: string
  ): Promise<Wallet> {
    const wallet = await this.walletType.newRandom(name, dbName);
    wallet.derivationPath = "m/44'/245'/0'/0/0";
    wallet._slpAware = true;
    return wallet;
  }

  /**
   * fromWIF - create an SLP aware wallet using the private key supplied in `Wallet Import Format`
   *
   * @param wif   WIF encoded private key string
   *
   * @returns instantiated wallet
   */
  public static async fromWIF(wif: string): Promise<Wallet> {
    const wallet = await this.walletType.fromWIF(wif);
    wallet.derivationPath = "m/44'/245'/0'/0/0";
    wallet._slpAware = true;
    return wallet;
  }

  /**
   * watchOnly - create an SLP aware watch-only wallet
   *
   * such kind of wallet does not have a private key and is unable to spend any funds
   * however it still allows to use many utility functions such as getting and watching balance, etc.
   *
   * @param address   cashaddress or slpaddress of a wallet
   *
   * @returns instantiated wallet
   */
  public static async watchOnly(address: string): Promise<Wallet> {
    const wallet = await this.walletType.watchOnly(toCashAddress(address));
    wallet.derivationPath = "m/44'/245'/0'/0/0";
    wallet._slpAware = true;
    return wallet;
  }

  /**
   * fromCashaddr - create an SLP aware watch-only wallet in the network derived from the address
   *
   * such kind of wallet does not have a private key and is unable to spend any funds
   * however it still allows to use many utility functions such as getting and watching balance, etc.
   *
   * @param address   cashaddress of a wallet
   *
   * @returns instantiated wallet
   */
  public static async fromCashaddr(address: string): Promise<Wallet> {
    const wallet = await this.walletType.fromCashaddr(address);
    wallet.derivationPath = "m/44'/245'/0'/0/0";
    wallet._slpAware = true;
    return wallet;
  }

  /**
   * fromSlpaddr - create an SLP aware watch-only wallet in the network derived from the address
   *
   * such kind of wallet does not have a private key and is unable to spend any funds
   * however it still allows to use many utility functions such as getting and watching balance, etc.
   *
   * @param address   slpaddress of a wallet
   *
   * @returns instantiated wallet
   */
  public static async fromSlpaddr(address: string): Promise<Wallet> {
    const wallet = await this.walletType.fromSlpaddr(address);
    wallet.derivationPath = "m/44'/245'/0'/0/0";
    wallet._slpAware = true;
    return wallet;
  }
  //#endregion
}

//#region Specific wallet classes
/**
 * Class to manage an slp enabled testnet wallet.
 */
export class TestNetSlp extends Slp {
  static get walletType() {
    return TestNetWallet;
  }
}

/**
 * Class to manage an slp enabled regtest wallet.
 */
export class RegTestSlp extends Slp {
  static get walletType() {
    return RegTestWallet;
  }
}

/**
 * Class to manage a bitcoin cash wif wallet.
 */
export class WifSlp extends Slp {
  static get walletType() {
    return WifWallet;
  }
}

/**
 * Class to manage a testnet wif wallet.
 */
export class TestNetWifSlp extends Slp {
  static get walletType() {
    return TestNetWifWallet;
  }
}

/**
 * Class to manage a regtest wif wallet.
 */
export class RegTestWifSlp extends Slp {
  static get walletType() {
    return RegTestWifWallet;
  }
}

/**
 * Class to manage a bitcoin cash watch wallet.
 */
export class WatchSlp extends Slp {
  static get walletType() {
    return WatchWallet;
  }
}

/**
 * Class to manage a testnet watch wallet.
 */
export class TestNetWatchSlp extends Slp {
  static get walletType() {
    return TestNetWatchWallet;
  }
}

/**
 * Class to manage a regtest watch wallet.
 */
export class RegTestWatchSlp extends Slp {
  static get walletType() {
    return RegTestWatchWallet;
  }
}
//#endregion
