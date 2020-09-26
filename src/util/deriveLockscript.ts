import { cashAddressToLockingBytecode } from "@bitauth/libauth";

/**
 * Helper function to convert an address to a locking script
 *
 * @param address   Address to convert to locking script
 *
 * @returns a locking script corresponding to the passed address
 */
export function deriveLockscript(address: string): Uint8Array {
  const result = cashAddressToLockingBytecode(address);

  if (typeof result === "string") throw new Error(result);

  return result.bytecode;
}
