import { Utxo, UtxoId } from "../interface.js";

export async function checkUtxos(
  utxoIds: UtxoId[],
  walletOrUtxos: Utxo[] | import("../wallet/Wif.js").Wallet
): Promise<Utxo[]> {
  const addressUtxos = Array.isArray(walletOrUtxos)
    ? walletOrUtxos
    : await walletOrUtxos.getUtxos();
  const absent = utxoIds.filter(
    (val) =>
      !addressUtxos.find(
        (utxo) => val.txid === utxo.txid && val.vout === utxo.vout
      )
  );
  if (absent.length) {
    const absentString = absent
      .map((val) => `${val.txid}:${val.vout}`)
      .join(", ");
    throw Error(`Utxos [${absentString}] not found in wallet`);
  }

  return addressUtxos.filter((val) =>
    utxoIds.find((utxo) => val.txid === utxo.txid && val.vout === utxo.vout)
  );
}
