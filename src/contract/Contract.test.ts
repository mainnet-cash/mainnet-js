import { Network } from "../interface";
import { RegTestWallet } from "../wallet/Wif";
import { CashscriptTransactionI } from "./interface";
import { Contract } from "./Contract";
import { binToHex } from "@bitauth/libauth";

describe(`Create Contract Tests`, () => {
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
    const bob = await RegTestWallet.fromId(process.env.BOB_ID!);

    const alicePkh = binToHex(alice.getPublicKeyHash());
    const bobPkh = binToHex(bob.getPublicKeyHash());

    const now = 215;

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
        value: 100000,
        unit: "satoshis",
      },
    ]);

    expect(contract.toString().length).toBeGreaterThan(30);
    expect(contract.toString()).toBe(
      "regtest:TlRaaU5tSXlNakEwTW1JNU1HUmtOamRpWmpKbVltWmlPV0ZtWmpka016ZG1ZbVZsTVRFeU5BPT06WlRVeVpUSmxPRFZrTldGa1lqTXhNV1V5TnpjeE56SmlaamRoWlRjNU5EaGlZell4TWpJeU13PT06TWpFMQ==:Y29udHJhY3QgVHJhbnNmZXJXaXRoVGltZW91dChieXRlczIwIHNlbmRlclBraCwgYnl0ZXMyMCByZWNpcGllbnRQa2gsIGludCB0aW1lb3V0KSB7CiAgICAgIGZ1bmN0aW9uIHRyYW5zZmVyKHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgcmVxdWlyZShoYXNoMTYwKHNpZ25pbmdQaykgPT0gcmVjaXBpZW50UGtoKTsKICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICB9CiAgCiAgICAgIGZ1bmN0aW9uIHRpbWVvdXQocHVia2V5IHNpZ25pbmdQaywgc2lnIHMpIHsKICAgICAgICAgIHJlcXVpcmUoaGFzaDE2MChzaWduaW5nUGspID09IHNlbmRlclBraCk7CiAgICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICAgICAgcmVxdWlyZSh0eC50aW1lID49IHRpbWVvdXQpOwogICAgICB9CiAgfQ==:1"
    );
    expect(contract.toString().slice(0, 8)).toBe("regtest:");

    const sig = alice.getSignatureTemplate();
    let fn = contract.getContractFunction("timeout");
    let txn = await fn(alice.publicKey!, sig)
      .to(alice.getDepositAddress(), 7000)
      .send();
    expect(txn.txid.length).toBe(64);
    expect(await alice.getBalance("sat")).toBe(7000);
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

    const alicePkh = binToHex(alice.getPublicKeyHash());
    const charliePkh = binToHex(charlie.getPublicKeyHash());

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
        value: 100000,
        unit: "satoshis",
      },
    ]);

    expect(contract.toString().length).toBeGreaterThan(30);
    expect(contract.toString().slice(0, 8)).toBe("regtest:");
    let txn = await contract.runFunctionFromStrings({
      action: "build",
      function: "timeout",
      arguments: [alice.publicKey!, alice.toString()],
      to: {
        cashaddr: alice.getDepositAddress(),
        value: 7000,
      },
      time: 215,
    } as CashscriptTransactionI);
    expect(txn.length).toBeGreaterThan(500);

    await alice.provider!.sendRawTransaction(txn);
    expect(await alice.getBalance("sat")).toBe(7000);
  });
});
