import { Utxo } from "../interface.js";

export function sumUtxoValue(utxos: Utxo[]) {
  if (utxos.length > 0) {
    const balanceArray: bigint[] = utxos.map((o: Utxo) => {
      return o.satoshis;
    });
    const balance = balanceArray.reduce((a: bigint, b: bigint) => a + b, 0n);
    return balance;
  } else {
    return 0n;
  }
}

export function sumTokenAmounts(utxos: Utxo[], tokenId: string): bigint {
  if (utxos.length > 0) {
    const tokenArray: bigint[] = utxos
      .filter((utxo) => utxo.token?.category === tokenId)
      .map((o: Utxo) => {
        return o.token?.amount || 0n;
      });
    const balance = tokenArray.reduce((a: bigint, b: bigint) => a + b, 0n);
    return balance;
  } else {
    return 0n;
  }
}
