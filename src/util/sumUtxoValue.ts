import { UnspentOutput } from "grpc-bchrpc-node/pb/bchrpc_pb";

export async function sumUtxoValue(utxos: UnspentOutput[]) {
  if (utxos) {
    const balanceArray: number[] = await Promise.all(
      utxos.map(async (o: UnspentOutput) => {
        return o.getValue();
      })
    );
    const balance = balanceArray.reduce((a: number, b: number) => a + b, 0);
    return balance;
  } else {
    return 0;
  }
}
