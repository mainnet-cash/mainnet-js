import { Network } from "../interface";
import { RegTestWallet } from "../wallet/Wif";
import { CashscriptTransactionI } from "./interface";
import { Contract } from "./Contract";
import { binToHex, instantiateSecp256k1 } from "@bitauth/libauth";
import { SignatureTemplate } from "cashscript";
import { ok } from "assert";

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

    const alicePkh = alice.getPublicKeyHash();
    const bobPkh = bob.getPublicKeyHash();

    const now = 100

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
    let txn = await fn(publicKey, sig)
      .to(bob.getDepositAddress(), 7000)
      .send();
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
      },
      time: 215,
    } as CashscriptTransactionI);
    expect(txn.length).toBeGreaterThan(500);

    await alice.provider!.sendRawTransaction(txn);
    expect(await contract.getBalance()).toBeLessThan(3000);
  });
});
