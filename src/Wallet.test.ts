require("dotenv").config({ path: '.env.regtest' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED="0"

import { Wallet } from "./Wallet";
import { generateBlock } from "./generateBlock"
import { CashAddressNetworkPrefix } from "@bitauth/libauth"
test("Send a transaction on the regression network", async () => {
  
  // At least 100 blocks must be mined before spending a coinbase transaction
  generateBlock(process.env.RPC_USER, process.env.RPC_PASS, 105)
  let network = process.env.NETWORK === 'regtest' ? CashAddressNetworkPrefix.regtest : CashAddressNetworkPrefix.testnet
  // Build Alice's wallet from Wallet Import Format string, send some sats
  const alice = new Wallet("Alice's Mining");
  await alice.fromWIF(process.env.PRIVATE_WIF, network); // insert WIF from #1
  await alice.send([
    ["bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj", [1000, "satoshi"]],
  ]);
  
  // Build Bob's wallet from a public address, check his balance.
  const bob = new Wallet("Bob's Recieving");
  bob.watchOnly("bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj")
  const bobBalance = await bob.balanceSats("bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj")
  expect(bobBalance).toBe(1000);

});
