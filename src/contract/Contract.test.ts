import { Network } from "../interface";
import { RegTestWallet } from "../wallet/Wif";
import { CashscriptTransactionI } from "./interface";
import { Contract } from "./Contract";
import { instantiateSecp256k1 } from "@bitauth/libauth";

describe(`Create Contract Tests`, () => {
  test("Should return info about a contract", async () => {
    let script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
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

    let contract = new Contract(
      script,
      [alicePkh, alicePkh, now],
      Network.REGTEST,
      1
    );

    let info = contract.info();

    expect(info.cashaddr).toBe(
      "bchreg:ppt0dzpt8xmt9h2apv9r60cydmy9k0jkfg4atpnp2f"
    );
    expect(info.contractId).toBe(
      "regtest:T0RZc01UZ3lMREUzT0N3ek1pdzJOaXd4T0RVc01UTXNNakUwTERFeU15d3lORElzTWpVeExESTFNU3d4TlRRc01qVTFMREV5TlN3MU5Td3lOVEVzTWpNNExERTNMRE0yOk9EWXNNVGd5TERFM09Dd3pNaXcyTml3eE9EVXNNVE1zTWpFMExERXlNeXd5TkRJc01qVXhMREkxTVN3eE5UUXNNalUxTERFeU5TdzFOU3d5TlRFc01qTTRMREUzTERNMjpNVEF3:Y29udHJhY3QgVHJhbnNmZXJXaXRoVGltZW91dChieXRlczIwIHNlbmRlclBraCwgYnl0ZXMyMCByZWNpcGllbnRQa2gsIGludCB0aW1lb3V0KSB7CiAgICAgIGZ1bmN0aW9uIHRyYW5zZmVyKHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgcmVxdWlyZShoYXNoMTYwKHNpZ25pbmdQaykgPT0gcmVjaXBpZW50UGtoKTsKICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICB9CgogICAgICBmdW5jdGlvbiB0aW1lb3V0KHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgICByZXF1aXJlKGhhc2gxNjAoc2lnbmluZ1BrKSA9PSBzZW5kZXJQa2gpOwogICAgICAgICAgcmVxdWlyZShjaGVja1NpZyhzLCBzaWduaW5nUGspKTsKICAgICAgICAgIHJlcXVpcmUodHgudGltZSA+PSB0aW1lb3V0KTsKICAgICAgfQogIH0=:1"
    );
    expect(info.parameters).toStrictEqual([
      "56b6b22042b90dd67bf2fbfb9aff7d37fbee1124",
      "56b6b22042b90dd67bf2fbfb9aff7d37fbee1124",
      now,
    ]);
    expect(info.script).toBe(script);
  });

  test("Should send a transfer with timeout script", async () => {
    let script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
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
    const bob = await RegTestWallet.newRandom();

    const alicePkh = alice.getPublicKeyHash();
    const bobPkh = bob.getPublicKeyHash();

    const now = 100;

    let contract = new Contract(
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
    // expect(contract.toString()).toBe(
    //   "regtest:TlRaaU5tSXlNakEwTW1JNU1HUmtOamRpWmpKbVltWmlPV0ZtWmpka016ZG1ZbVZsTVRFeU5BPT06WlRVeVpUSmxPRFZrTldGa1lqTXhNV1V5TnpjeE56SmlaamRoWlRjNU5EaGlZell4TWpJeU13PT06TWpFMQ==:Y29udHJhY3QgVHJhbnNmZXJXaXRoVGltZW91dChieXRlczIwIHNlbmRlclBraCwgYnl0ZXMyMCByZWNpcGllbnRQa2gsIGludCB0aW1lb3V0KSB7CiAgICAgIGZ1bmN0aW9uIHRyYW5zZmVyKHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgcmVxdWlyZShoYXNoMTYwKHNpZ25pbmdQaykgPT0gcmVjaXBpZW50UGtoKTsKICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICB9CiAgCiAgICAgIGZ1bmN0aW9uIHRpbWVvdXQocHVia2V5IHNpZ25pbmdQaywgc2lnIHMpIHsKICAgICAgICAgIHJlcXVpcmUoaGFzaDE2MChzaWduaW5nUGspID09IHNlbmRlclBraCk7CiAgICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICAgICAgcmVxdWlyZSh0eC50aW1lID49IHRpbWVvdXQpOwogICAgICB9CiAgfQ==:1"
    // );
    expect(contract.toString().slice(0, 8)).toBe("regtest:");

    const sig = bob.getSignatureTemplate();
    const secp256k1 = await instantiateSecp256k1();
    let publicKey = sig.getPublicKey(secp256k1);
    let fn = contract.getContractFunction("transfer");
    let txn = await fn(publicKey, sig).to(bob.getDepositAddress(), 7000).send();
    expect(txn.txid.length).toBe(64);
    expect(await bob.getBalance("sat")).toBe(7000);
  });

  test("Should send a transfer with timeout script, using runFunction", async () => {
    let script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
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

    let contract = new Contract(
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
    expect(contract.toString().slice(0, 8)).toBe("regtest:");
    let txn = await contract.runFunctionFromStrings({
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
    let script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
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

    let contract = new Contract(
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

    let contractUtxos = await contract.getUtxos();
    // Filter the list to only odd value utxos
    let oddUtxoIds = contractUtxos
      .utxos!.filter((utxo) => utxo.value % 2 == 1)
      .map((utxo) => {
        return utxo.utxoId;
      });

    expect(contract.toString().length).toBeGreaterThan(30);
    expect(contract.toString().slice(0, 8)).toBe("regtest:");
    let txn = await contract.runFunctionFromStrings({
      action: "build",
      function: "transfer",
      arguments: [charlie.getPublicKeyCompressed(), charlie.toString()],
      to: {
        to: charlie.getDepositAddress(),
        amount: 7000,
      },
      time: 215,
      utxoIds: oddUtxoIds,
    } as CashscriptTransactionI);
    expect(txn.length).toBeGreaterThan(500);

    let contractUtxos2 = await contract.getUtxos();
    expect(await contractUtxos2.utxos[0].value).toBe(10000);
    await charlie.provider!.sendRawTransaction(txn);
    expect(await contract.getBalance()).toBeGreaterThan(12690);
    expect(await charlie.getBalance("sat")).toBe(7000);
  });
});
