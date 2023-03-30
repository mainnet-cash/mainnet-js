import { RegTestWallet, Network, UtxoI, toUtxoId } from "mainnet-js";

import { CashscriptTransactionI } from "./interface";
import { Contract } from "./Contract";
import { getSignatureTemplate } from "./util";

describe(`Create Contract Tests`, () => {
  test("Should return info about a contract", async () => {
    const script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
      function transfer(pubkey signingPk, sig s) {
        require(hash160(signingPk) == recipientPkh);
        require(checkSig(s, signingPk));
      }

      function timeout(pubkey signingPk, sig s) {
          require(hash160(signingPk) == senderPkh);
          require(checkSig(s, signingPk));
          require(tx.time >= timeout);
      }
  }`;

    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);

    const alicePkh = alice.getPublicKeyHash();

    const now = 100;

    const contract = new Contract(
      script,
      [alicePkh, alicePkh, now],
      Network.REGTEST,
      1
    );

    const info = contract.info();
    expect(contract.getSerializedScript()).toBe(
      "Y29udHJhY3QgVHJhbnNmZXJXaXRoVGltZW91dChieXRlczIwIHNlbmRlclBraCwgYnl0ZXMyMCByZWNpcGllbnRQa2gsIGludCB0aW1lb3V0KSB7CiAgICAgIGZ1bmN0aW9uIHRyYW5zZmVyKHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgcmVxdWlyZShoYXNoMTYwKHNpZ25pbmdQaykgPT0gcmVjaXBpZW50UGtoKTsKICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICB9CgogICAgICBmdW5jdGlvbiB0aW1lb3V0KHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgICByZXF1aXJlKGhhc2gxNjAoc2lnbmluZ1BrKSA9PSBzZW5kZXJQa2gpOwogICAgICAgICAgcmVxdWlyZShjaGVja1NpZyhzLCBzaWduaW5nUGspKTsKICAgICAgICAgIHJlcXVpcmUodHgudGltZSA+PSB0aW1lb3V0KTsKICAgICAgfQogIH0="
    );
    expect(info.cashaddr).toBe(
      "bchreg:ppt0dzpt8xmt9h2apv9r60cydmy9k0jkfg4atpnp2f"
    );
    expect(info.contractId).toBe(
      "contract:regtest:T0RZc01UZ3lMREUzT0N3ek1pdzJOaXd4T0RVc01UTXNNakUwTERFeU15d3lORElzTWpVeExESTFNU3d4TlRRc01qVTFMREV5TlN3MU5Td3lOVEVzTWpNNExERTNMRE0yOk9EWXNNVGd5TERFM09Dd3pNaXcyTml3eE9EVXNNVE1zTWpFMExERXlNeXd5TkRJc01qVXhMREkxTVN3eE5UUXNNalUxTERFeU5TdzFOU3d5TlRFc01qTTRMREUzTERNMjpNVEF3:Y29udHJhY3QgVHJhbnNmZXJXaXRoVGltZW91dChieXRlczIwIHNlbmRlclBraCwgYnl0ZXMyMCByZWNpcGllbnRQa2gsIGludCB0aW1lb3V0KSB7CiAgICAgIGZ1bmN0aW9uIHRyYW5zZmVyKHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgcmVxdWlyZShoYXNoMTYwKHNpZ25pbmdQaykgPT0gcmVjaXBpZW50UGtoKTsKICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICB9CgogICAgICBmdW5jdGlvbiB0aW1lb3V0KHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgICByZXF1aXJlKGhhc2gxNjAoc2lnbmluZ1BrKSA9PSBzZW5kZXJQa2gpOwogICAgICAgICAgcmVxdWlyZShjaGVja1NpZyhzLCBzaWduaW5nUGspKTsKICAgICAgICAgIHJlcXVpcmUodHgudGltZSA+PSB0aW1lb3V0KTsKICAgICAgfQogIH0=:1"
    );
    expect(info.parameters).toStrictEqual([
      "56b6b22042b90dd67bf2fbfb9aff7d37fbee1124",
      "56b6b22042b90dd67bf2fbfb9aff7d37fbee1124",
      now,
    ]);
    expect(info.script).toBe(script);
  });

  test("Should send a transfer with timeout script", async () => {
    const script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
      function transfer(pubkey signingPk, sig s) {
        require(hash160(signingPk) == recipientPkh);
        require(checkSig(s, signingPk));
      }

      function timeout(pubkey signingPk, sig s) {
          require(hash160(signingPk) == senderPkh);
          require(checkSig(s, signingPk));
          require(tx.time >= timeout);
      }
  }`;

    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.fromSeed(
      "rubber amateur across squirrel deposit above dish toddler visa cherry clerk egg"
    );

    const alicePkh = alice.getPublicKeyHash();
    const bobPkh = bob.getPublicKeyHash();

    const now = 100;

    const contract = new Contract(
      script,
      [alicePkh, bobPkh, now],
      Network.REGTEST,
      1
    );

    // fund the escrow contract
    await alice.send([
      {
        cashaddr: contract.getDepositAddress()!,
        value: 10000,
        unit: "satoshis",
      },
    ]);

    expect(contract.toString().length).toBeGreaterThan(30);
    expect(contract.toString()).toBe(
      "contract:regtest:T0RZc01UZ3lMREUzT0N3ek1pdzJOaXd4T0RVc01UTXNNakUwTERFeU15d3lORElzTWpVeExESTFNU3d4TlRRc01qVTFMREV5TlN3MU5Td3lOVEVzTWpNNExERTNMRE0yOk15d3hNVE1zTmpBc01UZzRMREl4Tnl3eE5qQXNOaXd4TnpFc01qUTBMREUwTml3eU5UQXNNVEE0TERFNE9TdzRNeXd6TXl3eE56QXNNVEUyTERFME1Td3hNallzTlRjPTpNVEF3:Y29udHJhY3QgVHJhbnNmZXJXaXRoVGltZW91dChieXRlczIwIHNlbmRlclBraCwgYnl0ZXMyMCByZWNpcGllbnRQa2gsIGludCB0aW1lb3V0KSB7CiAgICAgIGZ1bmN0aW9uIHRyYW5zZmVyKHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgcmVxdWlyZShoYXNoMTYwKHNpZ25pbmdQaykgPT0gcmVjaXBpZW50UGtoKTsKICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICB9CgogICAgICBmdW5jdGlvbiB0aW1lb3V0KHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgICByZXF1aXJlKGhhc2gxNjAoc2lnbmluZ1BrKSA9PSBzZW5kZXJQa2gpOwogICAgICAgICAgcmVxdWlyZShjaGVja1NpZyhzLCBzaWduaW5nUGspKTsKICAgICAgICAgIHJlcXVpcmUodHgudGltZSA+PSB0aW1lb3V0KTsKICAgICAgfQogIH0=:1"
    );
    expect(contract.toString().slice(0, 17)).toBe("contract:regtest:");

    const sig = getSignatureTemplate(bob);
    const publicKey = sig.getPublicKey();
    const fn = contract.getContractFunction("transfer");
    const txn = await fn(publicKey, sig)
      .to(bob.getDepositAddress(), 7000n)
      .send();
    expect(txn.txid.length).toBe(64);
    expect(await bob.getBalance("sat")).toBe(7000);
  });

  test("Should send a transfer with timeout script, using runFunction", async () => {
    const script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
      function transfer(pubkey signingPk, sig s) {
        require(checkSig(s, signingPk));
        require(hash160(signingPk) == recipientPkh);
      }

      function timeout(pubkey signingPk, sig s) {
        require(checkSig(s, signingPk));
        require(hash160(signingPk) == senderPkh);
        require(tx.time >= timeout);
      }
    }`;

    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const charlie = await RegTestWallet.newRandom();

    const alicePkh = alice.getPublicKeyHash();
    const charliePkh = charlie.getPublicKeyHash();

    const now = 215;

    const contract = new Contract(
      script,
      [alicePkh, charliePkh, now],
      Network.REGTEST,
      1
    );

    // fund the escrow contract
    await alice.send([
      {
        cashaddr: contract.getDepositAddress()!,
        value: 10000,
        unit: "satoshis",
      },
    ]);
    expect(contract.toString().length).toBeGreaterThan(30);
    expect(contract.toString().slice(0, 17)).toBe("contract:regtest:");
    const txn = await contract.runFunctionFromStrings({
      action: "build",
      function: "timeout",
      arguments: [alice.getPublicKeyCompressed(), alice.toString()],
      to: {
        cashaddr: alice.getDepositAddress(),
        value: 7000,
        unit: "sat",
      },
      time: 215,
    } as CashscriptTransactionI);
    expect(txn.length).toBeGreaterThan(500);

    await alice.provider!.sendRawTransaction(txn);
    expect(await contract.getBalance()).toBeLessThan(3000);
  });

  test("Should send a transfer with timeout script, using runFunction", async () => {
    const script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
      function transfer(pubkey signingPk, sig s) {
        require(checkSig(s, signingPk));
        require(hash160(signingPk) == recipientPkh);
      }

      function timeout(pubkey signingPk, sig s) {
        require(checkSig(s, signingPk));
        require(hash160(signingPk) == senderPkh);
        require(tx.time >= timeout);
      }
    }`;

    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const charlie = await RegTestWallet.newRandom();

    const alicePkh = alice.getPublicKeyHash();
    const charliePkh = charlie.getPublicKeyHash();

    const now = 215;

    const contract = new Contract(
      script,
      [alicePkh, charliePkh, now],
      Network.REGTEST,
      1
    );

    // fund the escrow contract
    await alice.send([
      {
        cashaddr: contract.getDepositAddress()!,
        value: 10000,
        unit: "satoshis",
      },
      {
        cashaddr: contract.getDepositAddress()!,
        value: 10001,
        unit: "satoshis",
      },
    ]);

    const contractUtxos = await contract.getUtxos();
    // Filter the list to only odd value utxos
    const oddUtxoIds = contractUtxos
      .filter((utxo: UtxoI) => utxo.satoshis % 2 == 1)
      .map((utxo: UtxoI) => {
        return toUtxoId(utxo);
      });

    expect(contract.toString().length).toBeGreaterThan(30);
    expect(contract.toString().slice(0, 17)).toBe("contract:regtest:");
    const txn = await contract.runFunctionFromStrings({
      action: "build",
      function: "transfer",
      arguments: [charlie.getPublicKeyCompressed(), charlie.toString()],
      to: {
        to: charlie.getDepositAddress(),
        amount: 7000n,
      },
      time: 215,
      utxoIds: oddUtxoIds,
    } as CashscriptTransactionI);
    // const template = await contract.runFunctionFromStrings({
    //   action: "getBitauthUri",
    //   function: "transfer",
    //   arguments: [charlie.getPublicKeyCompressed(), charlie.toString()],
    //   to: {
    //     to: charlie.getDepositAddress(),
    //     amount: 7000n,
    //   },
    //   time: 215,
    //   utxoIds: oddUtxoIds,
    // } as CashscriptTransactionI) as any;
    expect(txn.length).toBeGreaterThan(500);

    const contractUtxos2 = await contract.getUtxos();
    expect(await contractUtxos2[0].satoshis).toBe(10000);
    await charlie.provider!.sendRawTransaction(txn);
    expect(await contract.getBalance()).toBeGreaterThan(12690);
    expect(await charlie.getBalance("sat")).toBe(7000);
  });
});
