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

export function sumTokenAmounts(utxos: UtxoI[], tokenId: string): number {
  if (utxos.length > 0) {
    const tokenArray: number[] = utxos
      .filter((utxo) => utxo.token?.tokenId === tokenId)
      .map((o: UtxoI) => {
        return o.token?.amount || 0;
      });
    const balance = tokenArray.reduce((a: number, b: number) => a + b, 0);
    return balance;
  } else {
    return 0;
  }
}
