import { cashAddressToLockingBytecode } from "@bitauth/libauth";
import {
  OpReturnData,
  SendRequest,
  TokenSendRequest,
} from "../../wallet/model.js";
import type { OutputOrderingFn, TxOutput } from "./types.js";

/**
 * Preserve the order produced by the caller (with change last when present).
 * Default when no `outputOrdering` option is supplied.
 */
export const outputOrderNatural: OutputOrderingFn = (ctx) => ctx.outputs;

/**
 * BIP69 output ordering: sort by output value ascending, breaking ties on
 * locking bytecode bytes ascending. Token data is intentionally not part of
 * the comparison key -- strict BIP69 is defined only for the value and the
 * `scriptPubKey`.
 *
 * The change output (if present) takes part in the sort like any other
 * output.
 */
export const outputOrderBip69: OutputOrderingFn = (ctx) =>
  [...ctx.outputs].sort(compareBip69Outputs);

/**
 * Shuffle the outputs. Improves privacy by making the change position
 * unguessable.
 */
export const outputOrderRandom: OutputOrderingFn = (ctx) =>
  shuffle(ctx.outputs);

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function compareBip69Outputs(a: TxOutput, b: TxOutput): number {
  const av = outputValueSats(a);
  const bv = outputValueSats(b);
  if (av < bv) return -1;
  if (av > bv) return 1;
  const abc = outputLockingBytecode(a);
  const bbc = outputLockingBytecode(b);
  return compareBytes(abc, bbc);
}

function outputValueSats(output: TxOutput): bigint {
  if (output instanceof OpReturnData) return 0n;
  if (output instanceof TokenSendRequest) return output.value ?? 1000n;
  if (output instanceof SendRequest) return output.value;
  // Plain-object outputs (rare on this path); be defensive.
  const v = (output as { value?: bigint }).value;
  return typeof v === "bigint" ? v : 0n;
}

function outputLockingBytecode(output: TxOutput): Uint8Array {
  if (output instanceof OpReturnData) return output.buffer;
  const cashaddr =
    output instanceof SendRequest || output instanceof TokenSendRequest
      ? output.cashaddr
      : (output as { cashaddr?: string }).cashaddr;
  if (!cashaddr) return new Uint8Array(0);
  const decoded = cashAddressToLockingBytecode(cashaddr);
  if (typeof decoded === "string") return new Uint8Array(0);
  return decoded.bytecode;
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
