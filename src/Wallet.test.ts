require("dotenv").config();
import { Wallet } from "./Wallet";

test("Generate a block on a Regression Network", async () => {
  const alice = new Wallet("Alice's Mining");
  await alice.fromWIF(process.env.REGTEST_PRIVATE_WIF); // insert WIF from #1
  await alice.send([
    ["bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj", [1000, "satoshi"]],
  ]);
  
  // const bob = new Wallet("Bob's Recieving");
  // bob.watchOnly("bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj")
  // expect(bob.balanceSats("bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj")).toBe(1000);

});
