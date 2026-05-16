import type { Utxo } from "../../interface.js";
import type {
  OpReturnData,
  SendRequest,
  TokenSendRequest,
} from "../../wallet/model.js";

export type TxOutput = SendRequest | TokenSendRequest | OpReturnData;

// ---------- Coin selection ----------

export interface CoinSelectionContext {
  /**
   * Plain BCH UTXOs that are eligible to top up the BCH portion of the
   * transaction. Token-bearing UTXOs needed to satisfy token requests have
   * already been picked by the built-in token-aware logic and are *not*
   * included here.
   */
  available: Utxo[];
  /**
   * UTXOs already pinned to the transaction (via `options.ensureUtxos` or by
   * the operation type, e.g. token genesis/mint/burn). The selection function
   * does not need to include these; they are added automatically.
   */
  pinned: Utxo[];
  /**
   * Total satoshis the transaction still needs to be funded with from
   * `available`. Accounts for outputs + estimated fee minus value already
   * contributed by `pinned` and any token UTXOs.
   */
  amountRequired: bigint;
  /** Network relay fee in sats/byte at the current best height. */
  feePerByte: number;
  /** Best block height -- useful for age-aware strategies. */
  bestHeight: number;
}

export type CoinSelectionFn = (ctx: CoinSelectionContext) => Utxo[];

// ---------- Input ordering ----------

export interface InputOrderingContext {
  /**
   * Inputs in the order produced by the selection step. The function should
   * return a permutation of this array.
   */
  inputs: Utxo[];
}

export type InputOrderingFn = (ctx: InputOrderingContext) => Utxo[];

// ---------- Output ordering ----------

export interface OutputOrderingContext {
  /**
   * Outputs in the order produced by the caller, with the change output
   * appended last when present.
   */
  outputs: TxOutput[];
  /**
   * Index of the change output within `outputs`, if any. `undefined` when
   * the transaction has no change (e.g. `discardChange` or change below the
   * dust threshold).
   */
  changeOutputIndex?: number;
}

export type OutputOrderingFn = (ctx: OutputOrderingContext) => TxOutput[];

// ---------- Fee ----------

export interface FeeContext {
  /** Encoded transaction size in bytes (computed by the build pipeline). */
  txSizeBytes: number;
  /**
   * Network relay fee in sats/byte at the current best height. Strategies
   * are free to ignore this if they encode a fixed rate.
   */
  relayFeePerByte: number;
}

export type FeeFn = (ctx: FeeContext) => bigint;
