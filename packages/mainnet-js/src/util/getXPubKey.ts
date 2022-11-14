import {
  deriveHdPrivateNodeFromSeed,
  deriveHdPath,
  deriveHdPublicNode,
  encodeHdPublicKey,
  HdKeyNetwork,
  hexToBin,
  ripemd160,
  secp256k1,
  sha256,
  sha512,
} from "@bitauth/libauth";

const crypto = { ripemd160, secp256k1, sha256, sha512 };

export async function getXPubKey(
  seed: Uint8Array | string,
  derivationPath: string,
  network: string
) {
  if (typeof seed === "string") {
    seed = hexToBin(seed);
  }
  let hdNode = deriveHdPrivateNodeFromSeed(seed, undefined, crypto);
  if (!hdNode.valid) {
    throw Error("Invalid private key derived from mnemonic seed");
  }

  let node = deriveHdPath(hdNode, derivationPath, crypto);
  if (typeof node === "string") {
    throw node;
  }
  let parentPublicNode = deriveHdPublicNode(node, crypto);

  let xPubKey = encodeHdPublicKey({
    network: network as HdKeyNetwork,
    node: parentPublicNode,
  }, crypto);
  return xPubKey;
}
