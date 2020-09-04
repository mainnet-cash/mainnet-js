process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { RegTestWallet } from "./wallet/Wif";
import { generateBlock } from "./generateBlock";
import { GrpcClient } from "grpc-bchrpc-node";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getBlockHeight() {
  let url = `${process.env.HOST_IP}:${process.env.GRPC_PORT}`;
  const cert = `${process.env.BCHD_BIN_DIRECTORY}/${process.env.RPC_CERT}`;
  const host = `${process.env.HOST}`;
  let client = new GrpcClient({
    url: url,
    testnet: true,
    rootCertPath: cert,
    options: {
      "grpc.ssl_target_name_override": host,
      "grpc.default_authority": host,
      "grpc.max_receive_message_length": -1,
    },
  });
  let blockchainInfo = await client.getBlockchainInfo();
  return blockchainInfo.getBestHeight();
}

beforeEach(async () => {
  if (!process.env.RPC_USER || !process.env.RPC_PASS) {
    throw Error("Missing env settings for rpc user");
  } else if (!process.env.BCHD_BIN_DIRECTORY) {
    throw Error("Missing bchd bin path");
  } else {
    // At least 100 blocks must be mined before spending a coinbase transaction
    generateBlock(
      process.env.RPC_USER,
      process.env.RPC_PASS,
      105,
      process.env.BCHD_BIN_DIRECTORY
    );
  }

  for (let i = 0; (await getBlockHeight()) < 100 && i < 5; i++) {
    console.log("Waiting blocks to be mined");
    await delay(1000);
  }
});

test("Send a transaction on the regression network", async () => {
  // Build Alice's wallet from Wallet Import Format string, send some sats
  const alice = new RegTestWallet("Alice's Mining");
  if (!process.env.PRIVATE_WIF) {
    throw Error("Attempted to pass an empty WIF");
  } else {
    await alice.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
    await alice.send([
      {
        cashaddr: "bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj",
        amount: { value: 1000, unit: "satoshi" },
      },
    ]);
    // Build Bob's wallet from a public address, check his balance.
    const bob = new RegTestWallet("Bob's Receiving");
    bob.watchOnly("bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj");
    const bobBalance = await bob.balanceSats(
      "bchreg:prc38tlqr6t5fk2nfcacp3w3hcljz4nj3sw247lksj"
    );
    expect(bobBalance).toBe(1000);
  }
});
