import { hexToBin } from "@bitauth/libauth";
import { DsproofData } from "../interface";
import { disconnectProviders, initProviders } from "../network/Connection";
import { toParseNotation } from "../network/constant";
import { createProvider } from "../network/default";
import { MockNetworkProvider } from "../network/MockNetworkProvider";
import { delay } from "../util/delay";
import { RegTestHDWallet, TestNetHDWallet } from "./HDWallet";
import { SendRequest, toUtxoId } from "./model";
import { RegTestWallet, TestNetWallet } from "./Wif";

const isMock = !!process.env.USE_MOCK_PROVIDER;

const CHIPNET_SERVER_1 = toParseNotation(
  ["wss://chipnet.bch.ninja:50004"],
  "1.5",
);
const CHIPNET_SERVER_2 = toParseNotation(
  ["wss://chipnet.imaginary.cash:50004"],
  "1.5",
);

const aliceId = process.env.ALICE_TESTNET_WALLET_ID || undefined;

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe("Double-spend proof tests", () => {
  (!isMock && aliceId ? test : test.skip)(
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
        { utxoIds: [utxoId], broadcast: false },
      );
      const resp2 = await alice.send(
        new SendRequest({ cashaddr: bob.cashaddr!, value: 2000n }),
        { utxoIds: [utxoId], broadcast: false },
      );

      // Create providers on different servers
      const provider1 = await createProvider("testnet", CHIPNET_SERVER_1);
      await provider1.connect();
      const provider2 = await createProvider("testnet", CHIPNET_SERVER_2);
      await provider2.connect();

      // Broadcast the first transaction on server 1
      const txHash = await provider1.sendRawTransaction(
        resp1.transaction!,
        true,
      );

      // Subscribe to dsproof on server 1
      const dsproofs: DsproofData[] = [];
      const cancel = await provider1.subscribeToDsproof(
        txHash,
        ([, dsproof]) => {
          if (dsproof !== null) {
            dsproofs.push(dsproof);
          }
        },
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
    },
  );

  (!isMock && aliceId ? test : test.skip)(
    "watchDoubleSpends detects double-spend on single-address wallet",
    async () => {
      const alice = await TestNetWallet.fromId(aliceId!);
      const bobHd = await TestNetHDWallet.newRandom();
      const bob = await TestNetWallet.fromPrivateKey(
        bobHd.walletCache.get(bobHd.getDepositAddress(0))!.privateKey!,
      );

      const utxos = await alice.getUtxos();
      expect(utxos.length).toBeGreaterThan(0);
      const suitableUtxo = utxos.find((u) => u.satoshis > 5000n);
      expect(suitableUtxo).toBeDefined();
      const utxoId = toUtxoId(suitableUtxo!);

      // Build two conflicting signed transactions without broadcasting
      const resp1 = await alice.send(
        new SendRequest({ cashaddr: bob.cashaddr!, value: 1000n }),
        { utxoIds: [utxoId], broadcast: false },
      );
      const resp2 = await alice.send(
        new SendRequest({ cashaddr: bob.cashaddr!, value: 2000n }),
        { utxoIds: [utxoId], broadcast: false },
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
    },
  );

  (isMock ? test : test.skip)(
    "Mock: subscribeToDsproof receives injected dsproof",
    async () => {
      const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
      const bob = await RegTestWallet.newRandom();

      // Send a transaction so we have a txHash to subscribe to
      const resp = await alice.send([
        { cashaddr: bob.cashaddr!, value: 1000n },
      ]);
      const txHash = resp.txId!;

      // Subscribe to dsproof notifications
      const dsproofs: DsproofData[] = [];
      const cancel = await (
        alice.provider as unknown as MockNetworkProvider
      ).subscribeToDsproof(txHash, ([, dsproof]) => {
        if (dsproof !== null) {
          dsproofs.push(dsproof);
        }
      });

      // Inject a dsproof via test.add_dsproof
      const mockDsproof: DsproofData = {
        dspid: "abc123",
        txid: txHash,
        hex: "deadbeef",
        outpoint: { txid: txHash, vout: 0 },
        descendants: [txHash],
      };
      const mc = (alice.provider as unknown as MockNetworkProvider).mc;
      await mc.request("test.add_dsproof", [txHash, mockDsproof]);

      await delay(200);
      await cancel();

      expect(dsproofs.length).toBe(1);
      expect(dsproofs[0].dspid).toBe("abc123");
      expect(dsproofs[0].txid).toBe(txHash);
      expect(dsproofs[0].outpoint.txid).toBe(txHash);
      expect(dsproofs[0].outpoint.vout).toBe(0);
      expect(dsproofs[0].descendants).toEqual([txHash]);
    },
  );

  (isMock ? test : test.skip)(
    "Mock: watchDoubleSpends detects injected dsproof",
    async () => {
      const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
      const bob = await RegTestWallet.newRandom();

      // Start watching for double-spends on bob
      const dsproofs: DsproofData[] = [];
      const cancelWatch = await bob.watchDoubleSpends(
        (dsproof) => {
          dsproofs.push(dsproof);
        },
        60000, // long window so it doesn't expire during test
      );

      // Send a transaction to bob
      const resp = await alice.send([
        { cashaddr: bob.cashaddr!, value: 1000n },
      ]);
      const txHash = resp.txId!;

      // Wait for the watchTransactionHashes callback to fire and set up
      // the dsproof subscription
      await delay(500);

      // Inject a dsproof for that transaction
      const mc = (alice.provider as unknown as MockNetworkProvider).mc;
      await mc.request("test.add_dsproof", [
        txHash,
        {
          dspid: "dsp456",
          txid: txHash,
          hex: "cafebabe",
          outpoint: { txid: txHash, vout: 0 },
          descendants: [],
        },
      ]);

      await delay(500);
      await cancelWatch();

      expect(dsproofs.length).toBe(1);
      expect(dsproofs[0].dspid).toBe("dsp456");
    },
  );

  (isMock ? test : test.skip)(
    "Mock: watchDoubleSpends on HD wallet detects injected dsproof",
    async () => {
      const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
      const hdBob = await RegTestHDWallet.newRandom();
      const bobAddr = hdBob.getDepositAddress();

      // Start watching for double-spends on HD wallet
      const dsproofs: DsproofData[] = [];
      const cancelWatch = await hdBob.watchDoubleSpends((dsproof) => {
        dsproofs.push(dsproof);
      }, 60000);

      // Send a transaction to the HD wallet
      const resp = await alice.send([{ cashaddr: bobAddr, value: 1000n }]);
      const txHash = resp.txId!;

      // Wait for watchTransactionHashes to set up the dsproof subscription
      await delay(2000);

      // Inject a dsproof
      const mc = (alice.provider as unknown as MockNetworkProvider).mc;
      await mc.request("test.add_dsproof", [
        txHash,
        {
          dspid: "hd-dsp-789",
          txid: txHash,
          hex: "feedface",
          outpoint: { txid: txHash, vout: 0 },
          descendants: [],
        },
      ]);

      await delay(500);
      await cancelWatch();

      expect(dsproofs.length).toBe(1);
      expect(dsproofs[0].dspid).toBe("hd-dsp-789");
    },
  );
});
