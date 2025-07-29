import {
  IConnector,
  WcSignTransactionRequest,
  WcSignTransactionResponse,
} from "@bch-wc2/interfaces";
import { BaseWallet } from "../wallet/Base.js";
import { SendRequestOptionsI } from "../wallet/interface.js";
import {
  OpReturnData,
  SendRequest,
  SendRequestArray,
  SendRequestType,
  SendResponse,
  TokenBurnRequest,
  TokenGenesisRequest,
  TokenMintRequest,
  TokenSendRequest,
} from "../wallet/model.js";

export interface WcTransactionOptions {
  broadcast?: boolean;
  userPrompt?: string;
}

export const generateWcSignTransactionRequest = (
  sendResponse: SendResponse,
  options?: WcTransactionOptions
): WcSignTransactionRequest => {
  if (!sendResponse.unsignedTransaction || !sendResponse.sourceOutputs) {
    throw new Error(
      "SendResponse does not contain an unsigned transaction or source outputs"
    );
  }

  return {
    ...options,
    transaction: sendResponse.unsignedTransaction,
    sourceOutputs: sendResponse.sourceOutputs,
  };
};

export type WcSendResponse = SendResponse & WcSignTransactionResponse;

// A wrapper class for signing transactions with WalletConnect
// Interfaces are the same as the original wallet methods
// Meant to be a drop-in replacement for the original wallet methods
export class WcSigner {
  public wallet!: BaseWallet;
  public connector: IConnector;

  constructor(wallet: BaseWallet, connector: IConnector) {
    if (!wallet || !connector) {
      throw new Error("Invalid wallet or connector");
    }

    this.wallet = wallet;
    this.connector = connector;
  }

  private async handleTransaction(
    walletMethod: (...args: any[]) => Promise<SendResponse>,
    walletArgs: any[],
    options?: SendRequestOptionsI & WcTransactionOptions,
    errorMsg: string = "Failed to sign transaction, user may have rejected the request"
  ): Promise<WcSendResponse> {
    const response = await walletMethod.apply(this.wallet, [
      ...walletArgs,
      { queryBalance: false, ...options, buildUnsigned: true },
    ]);

    const signRequest = generateWcSignTransactionRequest(response, {
      // ask to broadcast the transaction by default
      broadcast: true,
      ...options,
    });
    const signResponse = await this.connector.signTransaction(signRequest);

    if (!signResponse) {
      throw new Error(errorMsg);
    }

    return {
      ...response,
      ...signResponse,
    };
  }

  async send(
    requests:
      | SendRequest
      | TokenSendRequest
      | OpReturnData
      | Array<SendRequest | TokenSendRequest | OpReturnData>
      | SendRequestArray[],
    options?: SendRequestOptionsI & WcTransactionOptions
  ): Promise<WcSendResponse> {
    return this.handleTransaction(
      this.wallet.send,
      [requests],
      options,
      "Failed to sign send transaction, user may have rejected the request"
    );
  }

  public async sendMax(
    cashaddr: string,
    options?: SendRequestOptionsI & WcTransactionOptions
  ): Promise<WcSendResponse> {
    return this.handleTransaction(
      this.wallet.sendMax,
      [cashaddr],
      options,
      "Failed to sign send max transaction, user may have rejected the request"
    );
  }

  async tokenGenesis(
    genesisRequest: TokenGenesisRequest,
    sendRequests: SendRequestType | SendRequestType[] = [],
    options?: SendRequestOptionsI & WcTransactionOptions
  ): Promise<WcSendResponse> {
    return this.handleTransaction(
      this.wallet.tokenGenesis,
      [genesisRequest, sendRequests],
      options,
      "Failed to sign token genesis transaction, user may have rejected the request"
    );
  }

  public async tokenMint(
    tokenId: string,
    mintRequests: TokenMintRequest | Array<TokenMintRequest>,
    deductTokenAmount: boolean = false,
    options?: SendRequestOptionsI & WcTransactionOptions
  ): Promise<WcSendResponse> {
    return this.handleTransaction(
      this.wallet.tokenMint,
      [tokenId, mintRequests, deductTokenAmount],
      options,
      "Failed to sign token mint transaction, user may have rejected the request"
    );
  }

  public async tokenBurn(
    burnRequest: TokenBurnRequest,
    message?: string,
    options?: SendRequestOptionsI & WcTransactionOptions
  ): Promise<WcSendResponse> {
    return this.handleTransaction(
      this.wallet.tokenBurn,
      [burnRequest, message],
      options,
      "Failed to sign token burn transaction, user may have rejected the request"
    );
  }
}
