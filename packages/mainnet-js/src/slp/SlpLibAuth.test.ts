import { binToHex } from "@bitauth/libauth";
import { parseSLP } from "slp-parser";
import { DUST_UTXO_THRESHOLD } from "../constant";
import {
  SlpGetGenesisOutputs,
  SlpGetMintOutputs,
  SlpGetSendOutputs,
} from "../slp/SlpLibAuth";
import {
  SlpGenesisOptions,
  SlpSendRequest,
  SlpTokenType,
} from "../slp/interface";
import { RegTestWallet } from "../wallet/Wif";
import { SlpUtxoI } from "./interface";
import BigNumber from "bignumber.js";

test.skip("Test SLP genesis txo bytecode per SLP Spec", async () => {
  const wallet = await RegTestWallet.newRandom();

  const genesisOptions: SlpGenesisOptions = {
    name: "Tether Ltd. US dollar backed tokens",
    ticker: "USDT",
    decimals: 8,
    initialAmount: 100000000,
    documentUrl:
      "https://tether.to/wp-content/uploads/2016/06/TetherWhitePaper.pdf",
    documentHash:
      "db4451f11eda33950670aaf59e704da90117ff7057283b032cfaec7779313916",
    tokenReceiverSlpAddr: wallet.slp.slpaddr,
    batonReceiverSlpAddr: wallet.slp.slpaddr,
  };

  const result = await SlpGetGenesisOutputs(genesisOptions);
  const genesisTxoBytecode = result.SlpOutputs[0].lockingBytecode;

  const hex = binToHex(genesisTxoBytecode);
  expect(hex).toBe(
    "6a04534c500001010747454e45534953045553445423546574686572204c74642e20555320646f6c6c6172206261636b656420746f6b656e734168747470733a2f2f7465746865722e746f2f77702d636f6e74656e742f75706c6f6164732f323031362f30362f546574686572576869746550617065722e70646620db4451f11eda33950670aaf59e704da90117ff7057283b032cfaec77793139160108010208002386f26fc10000"
  );

  parseSLP(Buffer.from(hex, "hex"));
});

test("Test SLP genesis txo bytecode with empty strings", async () => {
  const wallet = await RegTestWallet.newRandom();

  const genesisOptions: SlpGenesisOptions = {
    name: "",
    ticker: "",
    decimals: 5,
    initialAmount: 1000,
    documentUrl: "",
    documentHash: "",
    tokenReceiverSlpAddr: wallet.slp.slpaddr,
    batonReceiverSlpAddr: wallet.slp.slpaddr,
  };

  const result = await SlpGetGenesisOutputs(genesisOptions);
  const genesisTxoBytecode = result.SlpOutputs[0].lockingBytecode;

  const hex = binToHex(genesisTxoBytecode);
  expect(hex).toBe(
    "6a04534c500001010747454e455349534c004c004c004c0001050102080000000005f5e100"
  );

  parseSLP(Buffer.from(hex, "hex"));
});

test("Test SLP genesis txo bytecode with utf strings", async () => {
  const wallet = await RegTestWallet.newRandom();

  const genesisOptions: SlpGenesisOptions = {
    name: "Music 🎵",
    ticker: "🎵",
    decimals: 0,
    initialAmount: 100000,
    documentUrl: "http://tiny.cc/gcmzcz",
    documentHash: "",
    tokenReceiverSlpAddr: wallet.slp.slpaddr,
    batonReceiverSlpAddr: wallet.slp.slpaddr,
  };

  const result = await SlpGetGenesisOutputs(genesisOptions);
  const genesisTxoBytecode = result.SlpOutputs[0].lockingBytecode;

  const hex = binToHex(genesisTxoBytecode);
  expect(hex).toBe(
    "6a04534c500001010747454e4553495304f09f8eb50a4d7573696320f09f8eb515687474703a2f2f74696e792e63632f67636d7a637a4c00010001020800000000000186a0"
  );

  parseSLP(Buffer.from(hex, "hex"));
});

test("Test SLP send txo bytecode per SLP Spec", async () => {
  const wallet = await RegTestWallet.newRandom();
  const fundingSlpUtxo: SlpUtxoI = {
    value: new BigNumber(100000000),
    decimals: 8,
    txid: "",
    vout: 1,
    satoshis: DUST_UTXO_THRESHOLD,
    ticker: "USDT",
    tokenId: "550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b35",
    type: SlpTokenType.Type1,
    isBaton: false,
  };
  const sendRequest: SlpSendRequest = {
    slpaddr: wallet.slp.slpaddr,
    value: 1000000,
    tokenId: "550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b35",
  };

  const result = await SlpGetSendOutputs(
    wallet.slp.slpaddr,
    [fundingSlpUtxo],
    [sendRequest]
  );
  const sendTxoBytecode = result.SlpOutputs[0].lockingBytecode;

  const hex = binToHex(sendTxoBytecode);
  expect(hex).toBe(
    "6a04534c500001010453454e4420550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b350800005af3107a40000800232bff5f46c000"
  );

  parseSLP(Buffer.from(hex, "hex"));
});

test("Test SLP mint txo bytecode per SLP Spec", async () => {
  const wallet = await RegTestWallet.newRandom();
  const batonSlpUtxo: SlpUtxoI = {
    value: new BigNumber(100000000),
    decimals: 8,
    txid: "",
    vout: 1,
    satoshis: DUST_UTXO_THRESHOLD,
    ticker: "USDT",
    tokenId: "550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b35",
    type: 0x01,
    isBaton: false,
  };

  const result = await SlpGetMintOutputs(
    {
      tokenId:
        "550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b35",
      value: 100000000,
      tokenReceiverSlpAddr: wallet.slp.slpaddr,
      batonReceiverSlpAddr: wallet.slp.slpaddr,
      endBaton: false,
    },
    [batonSlpUtxo]
  );
  const mintTxoBytecode = result.SlpOutputs[0].lockingBytecode;

  const hex = binToHex(mintTxoBytecode);
  expect(hex).toBe(
    "6a04534c50000101044d494e5420550d19eb820e616a54b8a73372c4420b5a0567d8dc00f613b71c5234dc884b35010208002386f26fc10000"
  );

  parseSLP(Buffer.from(hex, "hex"));
});
