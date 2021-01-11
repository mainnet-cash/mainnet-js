import { Network } from "../interface";
import { RegTestWallet } from "../wallet/Wif";
import { Contract } from "./Contract";
import { binToHex } from "@bitauth/libauth"

describe(`Create Contract Tests`, () => {

  test("Should send a transfer with timeout script", async () => {
    let script = `contract TransferWithTimeout(pubkey sender, pubkey recipient, int timeout) {
            function transfer(sig recipientSig) {
                require(checkSig(recipientSig, recipient));
            }
        
            function timeout(sig senderSig) {
                require(checkSig(senderSig, sender));
                require(tx.time >= timeout);
            }
        }`;

    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.fromId(process.env.BOB_ID!);

    const alicePkh = binToHex(alice.getPublicKeyHash());
    const bobPkh = binToHex(bob.getPublicKeyHash());
    
    const now = 215

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
    expect(contract.toString()).toBe("regtest:TURNME1UQmxaakEwT0dJelpHRXpOVEUzT1RObU5tVmtNVFJqWXpKbVpHVTBOakJpWldOak5XSTJOVGhrT1RFek9EUTBNMkk1WVRNd01EQTNNRGRoTm1FMzpNRE0wT1RjNFlXTTBOalJtTXpVNFlqSXpOV1l4TVRJeE1tVmlObVV3TVRkaFpqa3dNakUxWWprd1lqRm1aamMwTnpGa09XRmxNbUZpWWpWbE1Ea3lOak5pOk1qRTE=:Y29udHJhY3QgVHJhbnNmZXJXaXRoVGltZW91dChwdWJrZXkgc2VuZGVyLCBwdWJrZXkgcmVjaXBpZW50LCBpbnQgdGltZW91dCkgewogICAgICAgICAgICBmdW5jdGlvbiB0cmFuc2ZlcihzaWcgcmVjaXBpZW50U2lnKSB7CiAgICAgICAgICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHJlY2lwaWVudFNpZywgcmVjaXBpZW50KSk7CiAgICAgICAgICAgIH0KICAgICAgICAKICAgICAgICAgICAgZnVuY3Rpb24gdGltZW91dChzaWcgc2VuZGVyU2lnKSB7CiAgICAgICAgICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHNlbmRlclNpZywgc2VuZGVyKSk7CiAgICAgICAgICAgICAgICByZXF1aXJlKHR4LnRpbWUgPj0gdGltZW91dCk7CiAgICAgICAgICAgIH0KICAgICAgICB9:1");
    expect(contract.toString().slice(0, 8)).toBe("regtest:");

    const sig = bob.getSignatureTemplate()
    let fn = contract.getContractFunction('transfer')
    let txn = await fn(sig).to(bob.getDepositAddress(),7000).send()
    expect(txn.txid.length).toBe(64)
    expect(await bob.getBalance('sat')).toBe(7000)
    
  });


  
});