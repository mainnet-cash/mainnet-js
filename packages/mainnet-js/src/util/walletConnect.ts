import { WcSignTransactionRequest } from "@bch-wc2/interfaces";
import { SendResponse } from "../wallet/model";

export interface WcTransactionOptions {
  broadcast?: boolean;
  userPrompt?: string;
}

export const generateWcSignTransactionRequest = (sendResponse: SendResponse, options?: WcTransactionOptions): WcSignTransactionRequest => {
  if (!sendResponse.unsignedTransaction || !sendResponse.sourceOutputs) {
    throw new Error("SendResponse does not contain an unsigned transaction or source outputs");
  }

  return { ...options, transaction: sendResponse.unsignedTransaction, sourceOutputs: sendResponse.sourceOutputs };
}
