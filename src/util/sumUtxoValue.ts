import { Utxo } from "../interface";

export async function sumUtxoValue(utxos: Utxo[]) {
  if (utxos.length>0) {
    const balanceArray: number[] = await Promise.all(
      utxos.map(async (o: Utxo) => {
        return o.satoshis;
      })
    );
    const balance = balanceArray.reduce((a: number, b: number) => a + b, 0);
    return balance;
  } else {
    return 0;
  }
}
