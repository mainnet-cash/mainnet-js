import { UtxoI } from "../interface.js";

export function sumUtxoValue(utxos: UtxoI[]) {
  if (utxos.length > 0) {
    const balanceArray: number[] = utxos.map((o: UtxoI) => {
      return o.satoshis;
    });
    const balance = balanceArray.reduce((a: number, b: number) => a + b, 0);
    return balance;
  } else {
    return 0;
  }
}

export function sumTokenAmounts(utxos: UtxoI[], tokenId: string): bigint {
  if (utxos.length > 0) {
    const tokenArray: bigint[] = utxos
      .filter((utxo) => utxo.token?.tokenId === tokenId)
      .map((o: UtxoI) => {
        return o.token?.amount || 0n;
      });
    const balance = tokenArray.reduce((a: bigint, b: bigint) => a + b, 0n);
    return balance;
  } else {
    return 0n;
  }
}
