import { Network } from "../interface";
import { RegTestWallet } from "../wallet/Wif";
import { derivePublicKeyHash } from "../util/derivePublicKeyHash";
import { Contract } from "./Contract";

describe(`Create Contract Tests`, () => {
  test("Should serialize a transfer with timeout script", async () => {
    let script = `contract TransferWithTimeout(pubkey sender, pubkey recipient, int timeout) {
            function transfer(sig recipientSig) {
                require(checkSig(recipientSig, recipient));
            }
        
            function timeout(sig senderSig) {
                require(checkSig(senderSig, sender));
                require(tx.time >= timeout);
            }
        }`;
    const aliceId = `wif:regtest:${process.env.PRIVATE_WIF!}`;
    const alice = await RegTestWallet.fromId(aliceId);
    const alicePkh = derivePublicKeyHash(alice.cashaddr!);
    const bob = await RegTestWallet.newRandom();
    const bobPkh = derivePublicKeyHash(bob.cashaddr!);
    const epoch = Math.round(new Date().getTime() / 1000) + 100;
    let contract = await new Contract(
      script,
      [alicePkh, bobPkh, epoch],
      Network.REGTEST,
      1
    );

    expect(contract.toString().length).toBeGreaterThan(30);
    expect(contract.toString()).toBe((await contract.toString()).toString());
    expect(contract.toString().slice(0, 8)).toBe("regtest:");
  });
});
