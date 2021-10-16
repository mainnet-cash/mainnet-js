import { ElectrumClient } from "electrum-cash";
import { getNetworkProvider } from ".";
import { Network } from "../interface";

test("Should get a transaction with bare electrum", async () => {
  const electrum = new ElectrumClient(
    "Electrum client example",
    "1.4.1",
    "bch.imaginary.cash",
    50004,
    "wss"
  );
  await electrum.connect();
  const transactionID =
    "4db095f34d632a4daf942142c291f1f2abb5ba2e1ccac919d85bdc2f671fb251";
  const transactionHex = await electrum.request(
    "blockchain.transaction.get",
    transactionID
  );
  await electrum.disconnect();
});

test("Should get a transaction with provider", async () => {
  const provider = getNetworkProvider(Network.MAINNET);
  const transactionID =
    "4db095f34d632a4daf942142c291f1f2abb5ba2e1ccac919d85bdc2f671fb251";
  const transactionHex = await provider.getRawTransaction(transactionID);
  //console.log(transactionHex);
  await provider.disconnect();
});
