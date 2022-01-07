import {
  deriveHdPublicNodeChild,
  decodeHdPublicKey,
  encodeHdPublicKey,
  encodeCashAddress,
  instantiateBIP32Crypto,
  deriveHdPath,
  HdPublicNode,
  HdKeyNetwork,
  binToHex,
} from "@bitauth/libauth";
import path from "path";

import { hash160 } from "./hash160";

export async function getAddrsByXpubKey(
  xpub: string,
  path: string,
  count: number
) {
  let pathComponents = path.split("/");
  let rootStr = pathComponents.shift()!;
  let root: number;
  if (rootStr === "M" || rootStr === "m") {
    rootStr = pathComponents.shift()!;
  }
  root = parseInt(rootStr);
  let result: any = [];

  const start = parseInt(pathComponents.pop()!);
  const end = start + count;
  for (let curr = start; curr < end; curr++) {
    let childPath = ["M", root, ...pathComponents, curr].join("/");
    result.push(derivePublicNodeCashaddr(xpub, root, childPath));
  }
  return await Promise.all(result).then((result) => {
    return result;
  });
}

export async function getAddrsByXpubKeyObject(obj) {
  return await getAddrsByXpubKey(obj.xpubkey, obj.path, obj.count);
}

export async function derivePublicNodeCashaddr(
  xpub,
  index: number,
  path?: string
) {
  const crypto = await instantiateBIP32Crypto();
  const publicParent = await decodeHdPublicKey(crypto, xpub);

  if (typeof publicParent === "string") {
    throw new Error(publicParent);
  }
  let prefix = publicParent.network === "mainnet" ? "bitcoincash" : "bchtest";

  let node = await deriveHdPublicNodeChild(crypto, publicParent.node, index);
  if (typeof node === "string") {
    throw new Error(node);
  }

  let cashaddr;
  if (typeof path === "string") {
    if (path[0] !== "M") {
      throw Error("use M for public path derivation");
    }
    let childNode = deriveHdPath(crypto, publicParent.node, path);
    if (typeof childNode === "string") {
      throw new Error(childNode);
    } else {
      let childPkh = await hash160(childNode.publicKey);
      cashaddr = encodeCashAddress(prefix, 0, childPkh);
    }
  }
  return cashaddr;
}

export async function getXpubKeyInfo(hdPublicKey) {
  const crypto = await instantiateBIP32Crypto();
  let node = decodeHdPublicKey(crypto, hdPublicKey);
  if (typeof node === "string") {
    throw new Error(node);
  }
  return {
    version: node.network,
    depth: node.node.depth,
    parentFingerprint: binToHex(node.node.parentFingerprint),
    childNumber: node.node.childIndex,
    chain: binToHex(node.node.chainCode),
    data: binToHex(node.node.publicKey),
    fingerprint: binToHex((await hash160(node.node.publicKey)).slice(0, 4)),
  };
}

export async function getXpubKeyInfoObject(obj) {
  return await getXpubKeyInfo(obj.xpubkey);
}
