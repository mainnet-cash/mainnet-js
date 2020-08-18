require("dotenv").config();
import { Wallet } from "./Wallet";
import { generateBlock } from "./generateBlock"

test("Send a transaction on the regression network", async () => {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED="0"
  generateBlock(1)
  const alice = new Wallet("Alice's Mining");
  await alice.fromWIF(process.env.REGTEST_PRIVATE_WIF); // insert WIF from #1
  let txnHash = await alice.send([
    ["bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj", [1000, "satoshi"]],
  ]);
  console.log(txnHash)
  
  const bob = new Wallet("Bob's Recieving");
  bob.watchOnly("bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj")
  
  expect(bob.balanceSats("bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj")).toBe(1000);

});
