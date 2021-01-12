import { UtxoI } from "../interface";

const DELIMITER = ":";

// serialize the unspent transaction.
export function serializeUtxo(utxo: UtxoI) {
  if (utxo && utxo.txid) {
    return [utxo.txid, utxo.vout, utxo.satoshis].join(DELIMITER);
  } else {
    return undefined;
  }
}

// deserialize the unspent transaction.
export function deserializeUtxo(utxoId: string): UtxoI {
  let [txid, voutStr, satoshiStr] = utxoId.split(DELIMITER);
  return {
    txid: txid,
    vout: parseInt(voutStr),
    satoshis: parseInt(satoshiStr),
  };
}
