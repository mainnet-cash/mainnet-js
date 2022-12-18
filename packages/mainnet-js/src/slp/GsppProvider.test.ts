import { Network, RegTestWallet, toCashAddress } from "..";
import { GsppProvider } from "./GsppProvider";
import { base64ToBin, binToBase64, binToHex, hexToBin } from "@bitauth/libauth";
import cashaddrjs from "cashaddrjs";

const rotate = function (str) {
  return str
    .match(/.{1,2}/g)
    .reverse()
    .join("");
};

const addressToScriptpubkey = (address) => {
  const x = cashaddrjs.decode(toCashAddress(address));
  return Buffer.from(
    x.type === "P2PKH"
      ? [0x76, 0xa9, x.hash.length].concat(...x.hash, [0x88, 0xac])
      : x.type === "P2PK"
      ? [0xac, x.hash.length].concat(...x.hash, [0x87])
      : [0xa9, x.hash.length].concat(...x.hash, [0x87]) // assume p2sh
  ).toString("base64");
};

describe.skip("Gspp Provider tests", () => {
  // other GsppProvider tests are covered in the Slp.test.ts integration test suite

  test("Test graphsearch methods", async () => {
    const provider = new GsppProvider(Network.MAINNET);
    const resultStatus = await provider.GsppQuery({}, "v1/graphsearch/status");
    expect(resultStatus.block_height).toBeGreaterThan(0);

    const tokenId =
      "a2987562a405648a6c5622ed6c205fca6169faa8afeb96a994b48010bd186a66";
    const resultOracle = await provider.GsppQuery(
      { vout: 1, txid: rotate(tokenId) },
      "v1/graphsearch/outputoracle"
    );
    expect(rotate(binToHex(base64ToBin(resultOracle.tokenid)))).toBe(tokenId);
  });
});
