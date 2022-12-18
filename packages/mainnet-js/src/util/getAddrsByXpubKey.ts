import {
  deriveHdPublicNodeChild,
  decodeHdPublicKey,
  encodeCashAddress,
  deriveHdPath,
  binToHex,
  CashAddressNetworkPrefix,
  CashAddressType,
} from "@bitauth/libauth";

import { hash160 } from "./hash160.js";

export function getAddrsByXpubKey(
  xpub: string,
  path: string,
  count: number
): Array<string> {
  let pathComponents = path.split("/");
  let rootStr = pathComponents.shift()!;
  let root: number;
  if (rootStr === "M" || rootStr === "m") {
    rootStr = pathComponents.shift()!;
  }
  root = parseInt(rootStr);
  let result: Array<string> = [];

  const start = parseInt(pathComponents.pop()!);
  const end = start + count;
  for (let curr = start; curr < end; curr++) {
    let childPath = ["M", root, ...pathComponents, curr].join("/");
    result.push(derivePublicNodeCashaddr(xpub, root, childPath));
  }
  return result;
}

export function getAddrsByXpubKeyObject(obj): Array<string> {
  return getAddrsByXpubKey(obj.xpubkey, obj.path, obj.count);
}

export function derivePublicNodeCashaddr(
  xpub,
  index: number,
  path?: string
): string {
  const publicParent = decodeHdPublicKey(xpub);

  if (typeof publicParent === "string") {
    throw new Error(publicParent);
  }
  let prefix = (
    publicParent.network === "mainnet" ? "bitcoincash" : "bchtest"
  ) as CashAddressNetworkPrefix;

  let node = deriveHdPublicNodeChild(publicParent.node, index);
  if (typeof node === "string") {
    throw new Error(node);
  }

  let cashaddr;
  if (typeof path === "string") {
    if (path[0] !== "M") {
      throw Error("use M for public path derivation");
    }
    let childNode = deriveHdPath(publicParent.node, path);
    if (typeof childNode === "string") {
      throw new Error(childNode);
    } else {
      let childPkh = hash160(childNode.publicKey);
      cashaddr = encodeCashAddress(prefix, CashAddressType.p2pkh, childPkh);
    }
  }
  return cashaddr;
}

export function getXpubKeyInfo(hdPublicKey: string) {
  let node = decodeHdPublicKey(hdPublicKey);
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
    fingerprint: binToHex(hash160(node.node.publicKey).slice(0, 4)),
  };
}

export async function getXpubKeyInfoObject(obj) {
  return getXpubKeyInfo(obj.xpubkey);
}
