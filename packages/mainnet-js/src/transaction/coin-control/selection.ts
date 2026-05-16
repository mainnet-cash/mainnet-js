import type { Utxo } from "../../interface.js";
import type { CoinSelectionContext, CoinSelectionFn } from "./types.js";

/**
 * Walk the available UTXOs in the order they were given and accumulate until
 * `amountRequired` is met. This reproduces the historical behaviour of
 * mainnet-js prior to the coin-control API; it is the default when no
 * `coinSelection` option is supplied.
 */
export const selectNatural: CoinSelectionFn = (ctx) =>
  accumulateUntilFunded(ctx.available, ctx.amountRequired);

/**
 * Pick the largest UTXOs first. Minimises input count but consolidates value;
 * spends "big bills" before small change.
 */
export const selectLargestFirst: CoinSelectionFn = (ctx) =>
  accumulateUntilFunded(sortBySatoshisDesc(ctx.available), ctx.amountRequired);

/**
 * Pick the smallest UTXOs first. Maximises input count but tidies up dust
 * over time.
 */
export const selectSmallestFirst: CoinSelectionFn = (ctx) =>
  accumulateUntilFunded(sortBySatoshisAsc(ctx.available), ctx.amountRequired);

/**
 * Oldest (lowest block height) first. UTXOs without a `height` are treated as
 * unconfirmed and sorted to the end. Useful for privacy: spend coins that
 * have aged the most.
 */
export const selectOldestFirst: CoinSelectionFn = (ctx) =>
  accumulateUntilFunded(sortByHeightAsc(ctx.available), ctx.amountRequired);

/**
 * Newest (highest block height) first; unconfirmed UTXOs come first.
 */
export const selectNewestFirst: CoinSelectionFn = (ctx) =>
  accumulateUntilFunded(sortByHeightDesc(ctx.available), ctx.amountRequired);

/**
 * Shuffle the available UTXOs and walk in that order. Improves privacy by
 * making the input set less linkable to deterministic strategies. Uses
 * `Math.random` -- not cryptographically secure, but fine for selection.
 */
export const selectRandom: CoinSelectionFn = (ctx) =>
  accumulateUntilFunded(shuffle(ctx.available), ctx.amountRequired);

/**
 * Accumulative: walk the available UTXOs in their given order and include
 * each one until the required amount is met. Same algorithm as
 * `selectNatural` but kept as a separately-named export for clarity when
 * the caller wants to be explicit.
 */
export const selectAccumulative: CoinSelectionFn = selectNatural;

/**
 * Branch-and-bound: try to find a subset of `available` whose total is within
 * `[amountRequired, amountRequired + costOfChange]`, i.e. a "perfect" or
 * near-perfect match that avoids a change output entirely. Falls back to
 * `selectLargestFirst` when no such subset is found within a bounded search.
 *
 * `costOfChange` is approximated from `feePerByte * P2PKH_OUTPUT_SIZE` (34 B)
 * so the search has a chance to skip change outputs that would cost more than
 * the dust they save.
 */
export const selectBranchAndBound: CoinSelectionFn = (ctx) => {
  const target = ctx.amountRequired;
  const costOfChange = BigInt(Math.ceil(ctx.feePerByte * 34));
  const upperBound = target + costOfChange;
  // Sort descending to prune the search aggressively (largest contributions
  // come first; once a partial sum exceeds the upper bound we backtrack).
  const sorted = sortBySatoshisDesc(ctx.available);
  let bestMatch: number[] | null = null;
  const tryInclude: boolean[] = new Array(sorted.length).fill(false);
  let total = 0n;
  let depth = 0;
  // Iterative search with a budget so degenerate inputs don't hang.
  let iterations = 0;
  const maxIterations = 100_000;
  outer: while (iterations < maxIterations) {
    iterations++;
    if (total >= target && total <= upperBound) {
      bestMatch = tryInclude
        .map((picked, i) => (picked ? i : -1))
        .filter((i) => i >= 0);
      break;
    }
    if (total > upperBound || depth === sorted.length) {
      // Backtrack: unwind until we find a position we can flip off.
      while (depth > 0) {
        depth--;
        if (tryInclude[depth]) {
          tryInclude[depth] = false;
          total -= sorted[depth].satoshis;
          depth++;
          continue outer;
        }
      }
      break;
    }
    tryInclude[depth] = true;
    total += sorted[depth].satoshis;
    depth++;
  }

  if (bestMatch) {
    return bestMatch.map((i) => sorted[i]);
  }
  // Fallback when no exact subset found.
  return accumulateUntilFunded(sorted, target);
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function accumulateUntilFunded(utxos: Utxo[], required: bigint): Utxo[] {
  const picked: Utxo[] = [];
  let total = 0n;
  for (const u of utxos) {
    picked.push(u);
    total += u.satoshis;
    if (total >= required) break;
  }
  return picked;
}

function sortBySatoshisDesc(utxos: Utxo[]): Utxo[] {
  return [...utxos].sort((a, b) =>
    b.satoshis < a.satoshis ? -1 : b.satoshis > a.satoshis ? 1 : 0,
  );
}

function sortBySatoshisAsc(utxos: Utxo[]): Utxo[] {
  return [...utxos].sort((a, b) =>
    a.satoshis < b.satoshis ? -1 : a.satoshis > b.satoshis ? 1 : 0,
  );
}

function heightOrInfinity(u: Utxo): number {
  return typeof u.height === "number" && u.height > 0
    ? u.height
    : Number.POSITIVE_INFINITY;
}

function sortByHeightAsc(utxos: Utxo[]): Utxo[] {
  return [...utxos].sort((a, b) => heightOrInfinity(a) - heightOrInfinity(b));
}

function sortByHeightDesc(utxos: Utxo[]): Utxo[] {
  return [...utxos].sort((a, b) => heightOrInfinity(b) - heightOrInfinity(a));
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type { CoinSelectionContext, CoinSelectionFn };
