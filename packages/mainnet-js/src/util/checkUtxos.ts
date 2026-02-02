import { Utxo, UtxoId } from "../interface.js";

export function checkUtxos(utxoIds: UtxoId[], utxos: Utxo[]): Utxo[] {
  const walletUtxoMap = new Map<string, Utxo>();
  for (const utxo of utxos) {
    walletUtxoMap.set(`${utxo.txid}:${utxo.vout}`, utxo);
  }

  const result: Utxo[] = [];
  const absent: UtxoId[] = [];
  for (const id of utxoIds) {
    const key = `${id.txid}:${id.vout}`;
    const utxo = walletUtxoMap.get(key);
    if (utxo) {
      result.push(utxo);
    } else {
      absent.push(id);
    }
  }

  if (absent.length) {
    const absentString = absent
      .map((val) => `${val.txid}:${val.vout}`)
      .join(", ");
    throw Error(`Utxos [${absentString}] not found in wallet`);
  }

  return result;
}
