import {
  deriveHdPrivateNodeFromSeed,
  deriveHdPath,
  deriveHdPublicNode,
  encodeHdPublicKey,
  HdKeyNetwork,
  hexToBin,
} from "@bitauth/libauth";

export function getXPubKey(
  seed: Uint8Array | string,
  derivationPath: string,
  network: string
) {
  if (typeof seed === "string") {
    seed = hexToBin(seed);
  }
  let hdNode = deriveHdPrivateNodeFromSeed(seed, {
    assumeValidity: true, // TODO: we should switch to libauth's BIP39 implementation and set this to false
    throwErrors: true,
  });

  let node = deriveHdPath(hdNode, derivationPath);
  if (typeof node === "string") {
    throw node;
  }
  let parentPublicNode = deriveHdPublicNode(node);

  let xPubKey = encodeHdPublicKey(
    {
      network: network as HdKeyNetwork,
      node: parentPublicNode,
    },
    {
      throwErrors: true,
    }
  ).hdPublicKey;
  return xPubKey;
}
