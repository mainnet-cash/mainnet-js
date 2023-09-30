import { UtxoI } from "../interface.js";

export async function checkUtxos(
  utxos: UtxoI[],
  wallet: import("../wallet/Wif.js").Wallet
): Promise<UtxoI[]> {
  if (utxos.some((val) => val.satoshis === 0)) {
    const addressUtxos = await wallet.getAddressUtxos(wallet.cashaddr);
    const absent = utxos.filter(
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

    utxos = utxos.map(
      (val) =>
        addressUtxos.find(
          (utxo) => val.txid === utxo.txid && val.vout === utxo.vout
        )!
    );
  }

  return utxos;
}
