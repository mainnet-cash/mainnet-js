import { UtxoI } from "../interface";
import { UtxoItem } from "./model";

test("Should serialize utxo", () => {
  let utxo = new UtxoItem({
    txId: "this",
    index: 42,
    value: 1,
  }).toString();
  expect(utxo.toString()).toBe("this:42:1");
});

test("Should deserialize utxo", () => {
  let utxo = UtxoItem.fromId("this:42:1");
  expect(utxo!.txId).toBe("this");
  expect(utxo!.index).toBe(42);
  expect(utxo!.value).toBe(1);
  expect(utxo!.toString()).toBe("this:42:1");
});

test("Should deserialize utxo", () => {
  let u = {
    txid: "this",
    vout: 42,
    satoshis: 1,
  } as UtxoI;
  let utxo = UtxoItem.fromElectrum(u);
  expect(utxo!.txId).toBe("this");
  expect(utxo!.index).toBe(42);
  expect(utxo!.value).toBe(1);
  expect(utxo!.toString()).toBe("this:42:1");
});
