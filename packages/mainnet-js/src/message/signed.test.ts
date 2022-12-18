import { SignedMessage, hash_message } from "./signed.js";
import { Wallet, RegTestWallet, TestNetWallet } from "../wallet/Wif.js";
import { binToBase64, binToHex } from "@bitauth/libauth";

import fs from "fs";

async function loadLargeMessage() {
  const data = await fs.promises.readFile("./jest/data/bitcoin.tex", "utf-8");
  return data;
}

describe("Test message Signing and Verification", () => {
  test("Test the magic hash function", async () => {
    // Test that the double sha256 hash of the wrapped messages matches
    // what would be had internally in electron-cash
    // b'\x18Bitcoin Signed Message:\n' + b'{message.length}' + b'{message}'
    let test_hash = await hash_message("test");
    expect(binToHex(test_hash)).toBe(
      "9ce428d58e8e4caf619dc6fc7b2c2c28f0561654d1f80f322c038ad5e67ff8a6"
    );

    // b'\xe6\xb5\x8b\xe8\xaf\x95' in binary python
    let 测试_hash = await hash_message("测试");
    expect(binToHex(测试_hash)).toBe(
      "8d8405050b7a763ccd5683f8470ea7dcbd10a87da2b7fe07eb2679ba71229688"
    );
  });

  test("Test testnet signature from electron cash", async () => {
    let msg1 = "Chancellor on brink of second bailout for banks";
    let w1 = await Wallet.fromId(
      `wif:mainnet:L1TnU2zbNaAqMoVh65Cyvmcjzbrj41Gs9iTLcWbpJCMynXuap6UN`
    );
    expect(w1.cashaddr!).toBe(
      "bitcoincash:qqehccy89v7ftlfgr9v0zvhjzyy7eatdkqt05lt3nw"
    );
    let sig = await SignedMessage.sign(msg1, w1.privateKey!);

    let coreLibSig =
      "H/9jMOnj4MFbH3d7t4yCQ9i7DgZU/VZ278w3+ySv2F4yIsdqjsc5ng3kmN8OZAThgyfCZOQxZCWza9V5XzlVY0Y=";
    expect(sig.signature).toBe(coreLibSig);
    let result = await SignedMessage.verify(msg1, sig.signature, w1.cashaddr!);
    expect(result.valid).toBe(true);
    expect(result.details!.messageHash).toBe(
      "gE9BDBFAOqW+yoOzABjnM+LQRWHd4dvUVrsTR+sIWsU="
    );
    expect(result.details!.publicKeyHashMatch).toBe(true);
    expect(result.details!.signatureValid).toBe(true);
    expect(result.details!.signatureType).toBe("recoverable");
  });

  // cTHMu3b13uh4i4GANQKm1XeziZhph18fwZgdaVftxh4FSuqj2AGM
  // bchtest:qqf25s9nm4uq982t94vq75v78n4j0e4r4vdf9j48wn
  // INGajEdcctxl+WR/icZJ5mNenqcxfhqhAkBkAauBxfZFdeKaU/FaL7fxgVyTul6Qxz1Oesn8avN/F+AaFIcMP74=

  test("Test testnet signature from electron cash", async () => {
    let w = await TestNetWallet.fromId(
      "wif:testnet:cTHMu3b13uh4i4GANQKm1XeziZhph18fwZgdaVftxh4FSuqj2AGM"
    );
    expect(w.cashaddr!).toBe(
      "bchtest:qqf25s9nm4uq982t94vq75v78n4j0e4r4vdf9j48wn"
    );
    let msg = "test";
    let sig = await SignedMessage.sign(msg, w.privateKey!);
    let result = await SignedMessage.verify(msg, sig.signature, w.cashaddr!);
    expect(result.valid).toBe(true);
  });

  test("Test signing and verifying regtest signature using Alice's wallet", async () => {
    let w = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );
    let msg = "test";
    let sig = await SignedMessage.sign(msg, w.privateKey!);

    let result = await SignedMessage.verify(msg, sig.signature, w.cashaddr!);
    expect(result.valid).toBe(true);
  });

  test("Test signing and verifying regtest signature using Alice's wallet", async () => {
    let w = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );
    let msg = "测试";
    let sig = await SignedMessage.sign(msg, w.privateKey!);
    let result = await SignedMessage.verify(msg, sig.signature, w.cashaddr!);
    expect(result.valid).toBe(true);
  });

  test("Test signing and verifying a schnorr signature", async () => {
    let w = await Wallet.fromId(
      "wif:mainnet:L1TnU2zbNaAqMoVh65Cyvmcjzbrj41Gs9iTLcWbpJCMynXuap6UN"
    );
    let msg = "test";
    let sig = await SignedMessage.sign(msg, w.privateKey!);
    let result = await SignedMessage.verify(
      msg,
      sig.raw!.schnorr,
      undefined,
      w.publicKey!
    );
    expect(result.valid).toBe(true);
    expect(result.details!.signatureType).toBe("schnorr");
  });

  test("Test signing and verifying a der signature", async () => {
    let w = await Wallet.fromId(
      "wif:mainnet:L1TnU2zbNaAqMoVh65Cyvmcjzbrj41Gs9iTLcWbpJCMynXuap6UN"
    );
    let msg = "test";
    let sig = await SignedMessage.sign(msg, w.privateKey!);
    let result = await SignedMessage.verify(
      msg,
      sig.raw!.der,
      undefined,
      w.publicKey!
    );
    expect(result.valid).toBe(true);
    expect(result.details!.signatureType).toBe("der");
  });

  test("Test signing and verifying a ecdsa signature", async () => {
    let w = await Wallet.fromId(
      "wif:mainnet:L1TnU2zbNaAqMoVh65Cyvmcjzbrj41Gs9iTLcWbpJCMynXuap6UN"
    );
    let msg = "test";
    let sig = await SignedMessage.sign(msg, w.privateKey!);
    let result = await SignedMessage.verify(
      msg,
      sig.raw!.ecdsa,
      undefined,
      w.publicKey!
    );
    expect(result.valid).toBe(true);
    expect(result.details!.signatureType).toBe("ecdsa");
  });

  test("Test signing and verifying a long message", async () => {
    let w = await Wallet.fromId(
      "wif:mainnet:L1TnU2zbNaAqMoVh65Cyvmcjzbrj41Gs9iTLcWbpJCMynXuap6UN"
    );
    let msg = await loadLargeMessage();
    let sig = await SignedMessage.sign(msg, w.privateKey!);
    let result = await SignedMessage.verify(msg, sig.signature, w.cashaddr!);
    expect(result.valid).toBe(true);
  });

  test("Test electron-cash example from static wallet methods", async () => {
    let msg1 = "Chancellor on brink of second bailout for banks";
    let w1 = await Wallet.fromId(
      `wif:mainnet:L1TnU2zbNaAqMoVh65Cyvmcjzbrj41Gs9iTLcWbpJCMynXuap6UN`
    );
    expect(w1.cashaddr!).toBe(
      "bitcoincash:qqehccy89v7ftlfgr9v0zvhjzyy7eatdkqt05lt3nw"
    );
    let sig = await Wallet.signedMessage.sign(msg1, w1.privateKey!);
    let result = await Wallet.signedMessage.verify(
      msg1,
      sig.signature,
      w1.cashaddr!
    );
    expect(result.valid).toBe(true);
  });

  test("Test electron cash example from a wallet instance", async () => {
    let msg1 = "Chancellor on brink of second bailout for banks";
    let w1 = await Wallet.fromId(
      `wif:mainnet:L1TnU2zbNaAqMoVh65Cyvmcjzbrj41Gs9iTLcWbpJCMynXuap6UN`
    );
    expect(w1.cashaddr!).toBe(
      "bitcoincash:qqehccy89v7ftlfgr9v0zvhjzyy7eatdkqt05lt3nw"
    );
    let sig = await w1.sign(msg1);
    let result = await w1.verify(msg1, sig.signature);
    expect(result.valid).toBe(true);
  });
});
