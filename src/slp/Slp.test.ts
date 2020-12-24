import { UtxoI } from "../interface";
import { parseSLP } from "slp-parser";
import { Network } from "../interface";
import {
  disconnectProviders,
  getNetworkProvider,
  initProviders,
} from "../network";
import { ElectrumRawTransaction } from "../network/interface";
import { TestNetWallet, Wallet } from "../wallet/Wif";
import {
  getNonSlpUtxos,
  getSlpUtxos,
  getSuitableUtxos,
} from "../transaction/Wif";
describe("Test slp tokens", () => {
  test("Should parse slp data", async () => {
    const obj = parseSLP(
      Buffer.from("76a9141041fb024bd7a1338ef1959026bbba860064fe5f88ac", "hex")
    );
    console.log(JSON.stringify(obj, null, 2));
  });

  test("Should get many transactions", async () => {
    initProviders([Network.MAINNET]);
    let w = await Wallet.newRandom();
    // const utxos = await w.provider!.getUtxos("qrhvcy5xlegs858fjqf8ssl6a4f7wpstaqnt0wauwu");
    // const ids = utxos.map(val => val.txid);
    const provider = w.provider!;
    const tx_id =
      "550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b35";
    const response = await provider.getRawTransactionObject(tx_id);
    console.log(JSON.stringify(response, null, 2));
    disconnectProviders([Network.MAINNET]);
  });

  test("Should filter out slp utxos", async () => {
    initProviders([Network.MAINNET]);
    const provider = getNetworkProvider(Network.MAINNET);
    const bestHeight = await provider.getBlockHeight()!;
    const tx = (await provider.getRawTransactionObject(
      "550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b35"
    )) as ElectrumRawTransaction;
    const utxos = tx.vout.map(
      (val) =>
        ({ txid: tx.txid, vout: val.n, satoshis: val.value * 1e8 } as UtxoI)
    );
    let result = await getSuitableUtxos(utxos, undefined, bestHeight, [tx]);
    expect(utxos.length).toBe(4);
    expect(result.length).toBe(3);

    result = await getNonSlpUtxos(utxos, [tx]);
    expect(result.length).toBe(3);

    result = await getSlpUtxos(utxos, [tx]);
    expect(result.length).toBe(1);
    disconnectProviders([Network.MAINNET]);
  });
});
