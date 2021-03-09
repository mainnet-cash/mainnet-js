import { instantiateSha256, instantiateRipemd160 } from "@bitauth/libauth";

export async function hash160(message: Uint8Array) {
  const ripemd160 = await instantiateRipemd160();
  const sha256 = await instantiateSha256();
  return ripemd160.hash(sha256.hash(message));
}
