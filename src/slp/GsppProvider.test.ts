import { Network, RegTestWallet } from "..";
import { disconnectProviders, initProviders } from "../network";
import { GsppProvider } from "./GsppProvider";
import axios from "axios";
import { base64ToBin, binToBase64, binToHex } from "@bitauth/libauth";

const rotate = function(str) {
  return str.match(/.{1,2}/g).reverse().join('');
}



describe("Gspp Provider tests", () => {
  // test("Test should fail query", async () => {
  //   const provider = new GsppProvider(Network.MAINNET);
  //   // const result = await provider.GsppQuery({txid: rotate("28a6661fdce36f5d04ffe97c1651bc4c9400170f1940fb4be339e0e58f738539"), vout: 1}, "v1/graphsearch/outputoracle");
  //   const result = await provider.GsppQuery({}, "v1/graphsearch/status");

  //   console.log(JSON.stringify(result, null, 2));
  //   console.log(rotate(binToHex(base64ToBin(result.tokenid))));
  //   // console.log(rotate(binToHex(base64ToBin(result.groupid))));
  // });
  // qRRWtrIgQrkN1nvy+/ua/303++4RJIc=
  // dqkUVrayIEK5DdZ78vv7mv99N/vuESSIrA==
  test("Test GsppProvider SlpAllTokenBalances", async () => {
    const provider = new GsppProvider(Network.REGTEST);
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);

    // const result = await provider.SlpAllTokenBalances(aliceWallet.slp.slpaddr);

    // console.log(JSON.stringify(result, null, 2));

    // const otherResult = await provider.SlpTokenBalance(aliceWallet.slp.slpaddr, "ee8eb1d71fbe9815a35d01e8c9db3bd0607002f94e24ad4d1cdebcf8040a3fb5");

    // console.log(JSON.stringify(otherResult, null, 2));

    // const infoResult = await provider.SlpTokenInfo("ee8eb1d71fbe9815a35d01e8c9db3bd0607002f94e24ad4d1cdebcf8040a3fb5");
    // console.log(JSON.stringify(infoResult, null, 2));

    const all = await aliceWallet.slp.getSlpUtxos(aliceWallet.slp.slpaddr);
    const batons = await aliceWallet.slp.getBatonUtxos();
    const nonBatons = await aliceWallet.slp.provider.SlpSpendableUtxos(aliceWallet.slp.slpaddr);

    console.log(all, batons, nonBatons);
  });
});
