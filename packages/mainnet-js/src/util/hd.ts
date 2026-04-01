import {
  deriveHdPath,
  deriveHdPrivateNodeFromSeed,
  deriveHdPublicNode,
  deriveSeedFromBip39Mnemonic,
  encodeHdPublicKey,
  HdKeyNetwork,
} from "@bitauth/libauth";
import { DERIVATION_PATHS } from "../constant.js";
import { checkForEmptySeed } from "./checkForEmptySeed.js";
import { XPubKey } from "../wallet/model.js";

export const arrayRange = (start: number, stop: number) =>
  Array.from({ length: stop - start }, (_, index) => start + index);

export const getNextUnusedIndex = (
  index: number,
  statuses: Array<string | null>,
): number => {
  if (index === -1) {
    index = statuses.findIndex((status) => status === null);
    if (index === -1) {
      index = statuses.length;
    }
  }

  return index;
};

export async function deriveHdPaths(
  mnemonic: string,
  network: string,
  hdPaths: string[],
): Promise<any[]> {
  const seed = deriveSeedFromBip39Mnemonic(mnemonic);
  checkForEmptySeed(seed);
  const hdNode = deriveHdPrivateNodeFromSeed(seed, {
    assumeValidity: true,
    throwErrors: true,
  });

  const result: any[] = [];

  for (const path of hdPaths) {
    if (path === "m") {
      throw Error(
        "Storing or sharing of parent public key may lead to loss of funds. Storing or sharing *root* parent public keys is strongly discouraged, although all parent keys have risk. See: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki#implications",
      );
    }
    const childNode = deriveHdPath(hdNode, path);
    if (typeof childNode === "string") {
      throw Error(childNode);
    }
    const node = deriveHdPublicNode(childNode);
    if (typeof node === "string") {
      throw Error(node);
    }
    const xPubKey = encodeHdPublicKey(
      {
        network: network as HdKeyNetwork,
        node: node,
      },
      {
        throwErrors: true,
      },
    ).hdPublicKey;
    const key = new XPubKey({
      path: path,
      xPubKey: xPubKey,
    });

    result.push(await key.ready());
  }
  return result;
}

export async function getXPubKeys(
  mnemonic: string,
  network: string,
  paths?: string[],
): Promise<any[]> {
  return deriveHdPaths(mnemonic, network, paths ?? DERIVATION_PATHS);
}
