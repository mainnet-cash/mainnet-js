import { binToHex } from "@bitauth/libauth";
import { parseSLP } from "slp-parser";
import { DUST_UTXO_THRESHOLD } from "../constant";
import {
  SlpGetGenesisOutputs,
  SlpGetMintOutputs,
  SlpGetSendOutputs,
} from "../slp/SlpLibAuth";
import { SlpGenesisOptions, SlpSendRequest } from "../slp/interface";
import { RegTestWallet } from "../wallet/Wif";
import { SlpUtxoI } from "./interface";
import BigNumber from "bignumber.js";

test("Test SLP genesis txo bytecode per SLP Spec", async () => {
  const wallet = await RegTestWallet.newRandom();

  const genesisOptions: SlpGenesisOptions = {
    name: "Tether Ltd. US dollar backed tokens",
    ticker: "USDT",
    decimalPlaces: 8,
    initialAmount: 100000000,
    documentUrl:
      "https://tether.to/wp-content/uploads/2016/06/TetherWhitePaper.pdf",
    documentHash:
      "db4451f11eda33950670aaf59e704da90117ff7057283b032cfaec7779313916",
  };

  const result = await SlpGetGenesisOutputs(
    genesisOptions,
    wallet.cashaddr!,
    wallet.cashaddr!
  );
  const genesisTxoBytecode = result.SlpOutputs[0].lockingBytecode;

  const hex = binToHex(genesisTxoBytecode);
  expect(hex).toBe(
    "6a04534c500001010747454e45534953045553445423546574686572204c74642e20555320646f6c6c6172206261636b656420746f6b656e734168747470733a2f2f7465746865722e746f2f77702d636f6e74656e742f75706c6f6164732f323031362f30362f546574686572576869746550617065722e70646620db4451f11eda33950670aaf59e704da90117ff7057283b032cfaec77793139160108010208002386f26fc10000"
  );

  const obj = parseSLP(Buffer.from(hex, "hex"));
});

test("Test SLP send txo bytecode per SLP Spec", async () => {
  const wallet = await RegTestWallet.newRandom();
  const fundingSlpUtxo: SlpUtxoI = {
    amount: new BigNumber(100000000),
    decimals: 8,
    txid: "",
    vout: 1,
    satoshis: DUST_UTXO_THRESHOLD,
    ticker: "USDT",
    tokenId: "550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b35",
  };
  const sendRequest: SlpSendRequest = {
    cashaddr: wallet.cashaddr!,
    value: 1000000,
    ticker: "USDT",
    tokenId: "550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b35",
  };

  const result = await SlpGetSendOutputs([fundingSlpUtxo], [sendRequest]);
  const sendTxoBytecode = result.SlpOutputs[0].lockingBytecode;

  const hex = binToHex(sendTxoBytecode);
  expect(hex).toBe(
    "6a04534c500001010453454e4420550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b350800005af3107a40000800232bff5f46c000"
  );

  const obj = parseSLP(Buffer.from(hex, "hex"));
});

test("Test SLP mint txo bytecode per SLP Spec", async () => {
  const wallet = await RegTestWallet.newRandom();
  const batonSlpUtxo: SlpUtxoI = {
    amount: new BigNumber(100000000),
    decimals: 8,
    txid: "",
    vout: 1,
    satoshis: DUST_UTXO_THRESHOLD,
    ticker: "USDT",
    tokenId: "550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b35",
  };

  const result = await SlpGetMintOutputs(
    [batonSlpUtxo],
    "550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b35",
    100000000,
    wallet.cashaddr!,
    wallet.cashaddr!,
    false
  );
  const mintTxoBytecode = result.SlpOutputs[0].lockingBytecode;

  const hex = binToHex(mintTxoBytecode);
  expect(hex).toBe(
    "6a04534c50000101044d494e5420550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b35010208002386f26fc10000"
  );

  const obj = parseSLP(Buffer.from(hex, "hex"));
});
