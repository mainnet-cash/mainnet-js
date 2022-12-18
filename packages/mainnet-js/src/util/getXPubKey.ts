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
  let hdNode = deriveHdPrivateNodeFromSeed(seed);
  if (!hdNode.valid) {
    throw Error("Invalid private key derived from mnemonic seed");
  }

  let node = deriveHdPath(hdNode, derivationPath);
  if (typeof node === "string") {
    throw node;
  }
  let parentPublicNode = deriveHdPublicNode(node);

  let xPubKey = encodeHdPublicKey({
    network: network as HdKeyNetwork,
    node: parentPublicNode,
  });
  return xPubKey;
}
