import type { Utxo } from "../../interface.js";
import type { InputOrderingFn } from "./types.js";

/**
 * Preserve the selection order. This is the default when no `inputOrdering`
 * option is supplied.
 */
export const inputOrderNatural: InputOrderingFn = (ctx) => ctx.inputs;

/**
 * BIP69 input ordering: sort lexicographically by reversed txid then by
 * vout ascending. This matches the convention used by Bitcoin Core and
 * many other wallets.
 *
 * Note: Bitcoin transactions internally serialize txids in reverse byte
 * order, which is what BIP69 sorts on. The `Utxo.txid` field in mainnet-js
 * is in the user-facing big-endian hex form, so we compare its byte-reversal.
 */
export const inputOrderBip69: InputOrderingFn = (ctx) =>
  [...ctx.inputs].sort(compareBip69Inputs);

/**
 * Shuffle the inputs. Improves privacy by hiding the upstream selection
 * order (which can leak the chosen selection strategy).
 */
export const inputOrderRandom: InputOrderingFn = (ctx) => shuffle(ctx.inputs);

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function compareBip69Inputs(a: Utxo, b: Utxo): number {
  // Compare reversed txid bytes (Bitcoin's internal serialization order).
  const ar = reverseHex(a.txid);
  const br = reverseHex(b.txid);
  if (ar < br) return -1;
  if (ar > br) return 1;
  // Equal txid -> break tie on vout ascending.
  return a.vout - b.vout;
}

function reverseHex(hex: string): string {
  // Split into 2-char bytes and reverse. Falls back to lexicographic compare
  // when the string isn't a clean hex tx id.
  if (hex.length % 2 !== 0) return hex;
  let out = "";
  for (let i = hex.length - 2; i >= 0; i -= 2) {
    out += hex.slice(i, i + 2);
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
