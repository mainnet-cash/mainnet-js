import { UtxoI } from "../interface";
import { fromUtxoId, toUtxoId } from "./model";

test("Should serialize utxo", () => {
  const utxo = toUtxoId({
    txid: "this",
    vout: 42,
    satoshis: 1,
  }).toString();
  expect(utxo).toBe("this:42:1");
});

test("Should deserialize utxo", () => {
  const utxo = fromUtxoId("this:42:1");
  expect(utxo.txid).toBe("this");
  expect(utxo.vout).toBe(42);
  expect(utxo.satoshis).toBe(1);
});

test("Should deserialize utxo", () => {
  const u = {
    txid: "this",
    vout: 42,
    satoshis: 1,
  } as UtxoI;
  expect(toUtxoId(u)).toBe("this:42:1");
});
