import type { FeeFn } from "./types.js";

/**
 * Default fee strategy: relayFeePerByte * txSizeBytes, rounded up. Matches
 * the historical behaviour of mainnet-js when no `fee` option is supplied.
 */
export const feeFromRelay: FeeFn = (ctx) =>
  BigInt(Math.ceil(ctx.txSizeBytes * ctx.relayFeePerByte));

/**
 * Factory: charge a fixed rate (sats per byte) regardless of the network's
 * advertised relay fee. Useful when the caller wants to prioritise a tx
 * (higher rate) or save fees (lower, at the risk of slower propagation).
 *
 * @example
 *   send(requests, { fee: feeFixedPerByte(2) });
 */
export function feeFixedPerByte(satsPerByte: number): FeeFn {
  return (ctx) => BigInt(Math.ceil(ctx.txSizeBytes * satsPerByte));
}

/**
 * Factory: charge a fixed rate expressed in sats per kilobyte.
 *
 * @example
 *   send(requests, { fee: feeFixedPerKb(1000) }); // ~1 sat/byte
 */
export function feeFixedPerKb(satsPerKb: number): FeeFn {
  return (ctx) => BigInt(Math.ceil((ctx.txSizeBytes * satsPerKb) / 1000));
}

/**
 * Factory: pay a fixed absolute fee, ignoring transaction size. Caller takes
 * responsibility for the fee being large enough to relay; under-paying can
 * lead to the transaction being rejected by the network.
 *
 * @example
 *   send(requests, { fee: feeAbsolute(500n) });
 */
export function feeAbsolute(sats: bigint): FeeFn {
  return () => sats;
}
