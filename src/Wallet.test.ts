process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { RegTestWallet } from "./wallet/Wif";

test("Send a transaction on the regression network", async () => {
  // Build Alice's wallet from Wallet Import Format string, send some sats
  const alice = new RegTestWallet("Alice's Mining");
  if (!process.env.PRIVATE_WIF) {
    throw Error("Attempted to pass an empty WIF");
  } else {
    await alice.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
    await alice.send(
      [
        {
          cashaddr: "bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj",
          amount: { value: 1000, unit: "satoshi" },
        },
      ]
    );
    // Build Bob's wallet from a public address, check his balance.
    const bob = new RegTestWallet("Bob's Receiving");
    bob.watchOnly("bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj");
    const bobBalance = await bob.balanceSats(
      "bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj"
    );
    expect(bobBalance).toBe(1000);
  }
});
