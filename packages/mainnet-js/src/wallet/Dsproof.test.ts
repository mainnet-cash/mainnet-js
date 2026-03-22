import { TestNetWallet } from "./Wif";
import { initProviders, disconnectProviders } from "../network/Connection";
import { createProvider } from "../network/default";
import { toParseNotation } from "../network/constant";
import { delay } from "../util/delay";
import { hexToBin } from "@bitauth/libauth";
import { CancelFn } from "./interface";
import { DsproofData } from "../interface";
import { SendRequest, toUtxoId } from "./model";
import { TestNetHDWallet } from "./HDWallet";

const CHIPNET_SERVER_1 = toParseNotation(
  ["wss://chipnet.bch.ninja:50004"],
  "1.5"
);
const CHIPNET_SERVER_2 = toParseNotation(
  ["wss://chipnet.imaginary.cash:50004"],
  "1.5"
);

const aliceId = process.env.ALICE_TESTNET_WALLET_ID || undefined;

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe("Double-spend proof tests", () => {
  (aliceId ? test : test.skip)(
    "Provider dsproof subscription receives proof data on double-spend",
    async () => {
      const alice = await TestNetWallet.fromId(aliceId!);
      const bob = await TestNetWallet.newRandom();

      const utxos = await alice.getUtxos();
      expect(utxos.length).toBeGreaterThan(0);
      // Pick a UTXO large enough for both transactions
      const suitableUtxo = utxos.find((u) => u.satoshis > 5000n);
      expect(suitableUtxo).toBeDefined();
      const utxoId = toUtxoId(suitableUtxo!);

      // Build two conflicting signed transactions without broadcasting
      const resp1 = await alice.send(
        new SendRequest({ cashaddr: bob.cashaddr!, value: 1000n }),
        { utxoIds: [utxoId], broadcast: false }
      );
      const resp2 = await alice.send(
        new SendRequest({ cashaddr: bob.cashaddr!, value: 2000n }),
        { utxoIds: [utxoId], broadcast: false }
      );

      // Create providers on different servers
      const provider1 = await createProvider("testnet", CHIPNET_SERVER_1);
      await provider1.connect();
      const provider2 = await createProvider("testnet", CHIPNET_SERVER_2);
      await provider2.connect();

      // Broadcast the first transaction on server 1
      const txHash = await provider1.sendRawTransaction(
        resp1.transaction!,
        true
      );

      // Subscribe to dsproof on server 1
      const dsproofs: DsproofData[] = [];
      const cancel = await provider1.subscribeToDsproof(
        txHash,
        ([, dsproof]) => {
          if (dsproof !== null) {
            dsproofs.push(dsproof);
          }
        }
      );

      // Broadcast the conflicting tx on server 2
      await provider2
        .sendRawTransaction(resp2.transaction!, false)
        .catch(() => {});

      await delay(5000);
      await cancel();
      await provider1.disconnect();
      await provider2.disconnect();

      // Should have received a dsproof
      expect(dsproofs.length).toBeGreaterThan(0);
      const proof = dsproofs[0];
      expect(proof.txid).toBeDefined();
      expect(proof.dspid).toBeDefined();
      expect(proof.hex).toBeDefined();
      expect(proof.outpoint).toBeDefined();
      expect(proof.outpoint.txid).toBeDefined();
      expect(typeof proof.outpoint.vout).toBe("number");
      expect(proof.descendants).toBeDefined();
      expect(Array.isArray(proof.descendants)).toBe(true);
    }
  );

  (aliceId ? test : test.skip)(
    "watchDoubleSpends detects double-spend on single-address wallet",
    async () => {
      const alice = await TestNetWallet.fromId(aliceId!);
      const bobHd = await TestNetHDWallet.newRandom();
      const bob = await TestNetWallet.fromPrivateKey(
        bobHd.walletCache.get(bobHd.getDepositAddress(0))!.privateKey!
      );

      const utxos = await alice.getUtxos();
      expect(utxos.length).toBeGreaterThan(0);
      const suitableUtxo = utxos.find((u) => u.satoshis > 5000n);
      expect(suitableUtxo).toBeDefined();
      const utxoId = toUtxoId(suitableUtxo!);

      // Build two conflicting signed transactions without broadcasting
      const resp1 = await alice.send(
        new SendRequest({ cashaddr: bob.cashaddr!, value: 1000n }),
        { utxoIds: [utxoId], broadcast: false }
      );
      const resp2 = await alice.send(
        new SendRequest({ cashaddr: bob.cashaddr!, value: 2000n }),
        { utxoIds: [utxoId], broadcast: false }
      );

      // Start watching for double-spends on bob
      const dsproofs: DsproofData[] = [];
      const hdCancelWatch = await bobHd.watchDoubleSpends((dsproof) => {
        dsproofs.push(dsproof);
      });

      const cancelWatch = await bob.watchDoubleSpends((dsproof) => {
        dsproofs.push(dsproof);
      });

      // Broadcast first tx via alice's provider
      await alice.submitTransaction(hexToBin(resp1.transaction!), true);

      // Broadcast conflicting tx via a different server
      const provider2 = await createProvider("testnet", CHIPNET_SERVER_2);
      await provider2.connect();
      await provider2
        .sendRawTransaction(resp2.transaction!, false)
        .catch(() => {});

      await delay(5000);
      await cancelWatch();
      await hdCancelWatch();
      await provider2.disconnect();

      // Should have received a dsproof
      expect(dsproofs.length).toBe(2);
      expect(dsproofs[0].txid).toBeDefined();
      expect(dsproofs[0].outpoint).toBeDefined();
    }
  );
});
