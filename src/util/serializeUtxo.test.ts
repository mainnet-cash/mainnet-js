import { serializeUtxo, deserializeUtxo } from "./serializeUtxo"
import { UtxoI } from "../interface"


test("Should serialize utxo",  () => {
    let utxoId = serializeUtxo({
        txid: "this",
        vout: 42,
        satoshis: 1
    });
    expect(utxoId).toBe("this:42:1");
});

test("Should deserialize utxo", () => {
    let utxo = deserializeUtxo("this:42:1")
    
    expect(utxo!.txid).toBe("this");
    expect(utxo!.vout).toBe(42);
    expect(utxo!.satoshis).toBe(1);
    
});
