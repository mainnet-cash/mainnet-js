process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { UnitEnum, WalletTypeEnum } from "./wallet/enum";
import { SendRequest, Amount } from "./wallet/model";
import { RegTestWallet } from "./wallet/Wif";
import { walletFromIdString, createWalletObject } from "./wallet/createWallet";

test("Send a transaction on the regression network", async () => {
  // Build Alice's wallet from Wallet Import Format string, send some sats
  const alice = new RegTestWallet("Alice's Mining");
  if (!process.env.PRIVATE_WIF) {
    throw Error("Attempted to pass an empty WIF");
  } else {
    await alice.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
    const bob = await createWalletObject({
      "type": WalletTypeEnum.Wif,
      "network": "regtest",
      "name": "Bob's random wallet"
    });
    await alice.send([
      {
        cashaddr: bob.cashaddr!,
        amount: new Amount({ value: 1100, unit: UnitEnum.Sat }),
      },
    ]);
    // Build Bob's wallet from a public address, check his balance.
    const bobBalance = await bob.balance();
    expect(bobBalance.sat).toBe(1100);
  }
});

test("Send a transaction on testnet", async () => {
  // Build Alice's wallet from Wallet Import Format string, send some sats

  if (
    !process.env.ALICE_TESTNET_WALLET_ID 
  ) {
    throw Error("Missing testnet env keys");
  }
  const alice = await walletFromIdString(process.env.ALICE_TESTNET_WALLET_ID);
  const bob = await createWalletObject({
    "type": WalletTypeEnum.Wif,
    "network": "testnet",
    "name": "Bob's random wallet"
  });

  if (!alice.cashaddr || !bob.cashaddr) {
    throw Error("Alice or Bob's wallet are missing addresses");
  }
  if (!alice.privateKey || !bob.privateKey) {
    throw Error("Alice or Bob's wallet are missing private ke");
  }
  await alice.send([
    {
      cashaddr: bob.cashaddr,
      amount: new Amount({ value: 1100, unit: UnitEnum.Sat }),
    },
  ]);

  // Build Bob's wallet from a public address, check his balance.

  await bob.sendMax({ cashaddr: alice.cashaddr });
  const bobBalanceFinal = await bob.balance();
  expect(bobBalanceFinal.sat).toBe(0);
});
