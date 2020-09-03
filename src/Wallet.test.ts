process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { RegTestWallet } from "./wallet/Wif";
import { generateBlock } from "./generateBlock";

test("Send a transaction on the regression network", async () => {
  // At least 100 blocks must be mined before spending a coinbase transaction

  if (!process.env.RPC_USER || !process.env.RPC_PASS) {
    throw Error("Missing env settings for rpc user");
  } else if (!process.env.BCHD_BIN_DIRECTORY) {
    throw Error("Missing bchd bin path");
  } else {
    generateBlock(
      process.env.RPC_USER,
      process.env.RPC_PASS,
      105,
      process.env.BCHD_BIN_DIRECTORY
    );

    // Build Alice's wallet from Wallet Import Format string, send some sats
    const alice = new RegTestWallet("Alice's Mining");
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      await alice.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
      await alice.send([
        { address:
          "bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj",
          amount: { value: 1000, unit:"satoshi"}
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
  }
});
