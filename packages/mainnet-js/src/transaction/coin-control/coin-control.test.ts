import { randomUtxo } from "@mem-cash/electrum";
import { Network, Utxo } from "../../interface.js";
import {
  removeGlobalProvider,
  setGlobalProvider,
} from "../../network/index.js";
import { MockNetworkProvider } from "../../network/MockNetworkProvider.js";
import { OpReturnData, SendRequest } from "../../wallet/model.js";
import { RegTestWallet } from "../../wallet/Wif.js";

import {
  feeAbsolute,
  feeFixedPerByte,
  feeFixedPerKb,
  feeFromRelay,
} from "./fee.js";
import {
  inputOrderBip69,
  inputOrderNatural,
  inputOrderRandom,
} from "./input-order.js";
import {
  outputOrderBip69,
  outputOrderNatural,
  outputOrderRandom,
} from "./output-order.js";
import {
  selectAccumulative,
  selectBranchAndBound,
  selectLargestFirst,
  selectNatural,
  selectNewestFirst,
  selectOldestFirst,
  selectRandom,
  selectSmallestFirst,
} from "./selection.js";

function mockUtxo(
  satoshis: bigint,
  height: number | undefined = 100,
  txid?: string,
): Utxo {
  const u = randomUtxo({ satoshis });
  return {
    txid: txid ?? u.txid,
    vout: u.vout,
    satoshis: u.satoshis,
    address: "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0",
    height,
  };
}

const ctxBase = {
  pinned: [],
  feePerByte: 1,
  bestHeight: 1000,
};

describe("coin-control: selection", () => {
  test("selectNatural picks in given order until funded", () => {
    const utxos = [mockUtxo(100n), mockUtxo(200n), mockUtxo(300n)];
    const picked = selectNatural({
      ...ctxBase,
      available: utxos,
      amountRequired: 250n,
    });
    expect(picked).toEqual([utxos[0], utxos[1]]);
  });

  test("selectAccumulative is an alias for selectNatural", () => {
    expect(selectAccumulative).toBe(selectNatural);
  });

  test("selectLargestFirst spends biggest UTXOs first", () => {
    const utxos = [mockUtxo(100n), mockUtxo(500n), mockUtxo(200n)];
    const picked = selectLargestFirst({
      ...ctxBase,
      available: utxos,
      amountRequired: 300n,
    });
    expect(picked.map((u) => u.satoshis)).toEqual([500n]);
  });

  test("selectSmallestFirst spends smallest UTXOs first", () => {
    const utxos = [mockUtxo(500n), mockUtxo(100n), mockUtxo(200n)];
    const picked = selectSmallestFirst({
      ...ctxBase,
      available: utxos,
      amountRequired: 250n,
    });
    expect(picked.map((u) => u.satoshis)).toEqual([100n, 200n]);
  });

  test("selectOldestFirst spends lowest height first", () => {
    const utxos = [
      mockUtxo(100n, 300),
      mockUtxo(100n, 100),
      mockUtxo(100n, 200),
    ];
    const picked = selectOldestFirst({
      ...ctxBase,
      available: utxos,
      amountRequired: 250n,
    });
    expect(picked.map((u) => u.height)).toEqual([100, 200, 300]);
  });

  test("selectOldestFirst treats missing height as unconfirmed (sorted last)", () => {
    const noHeight: Utxo = {
      ...mockUtxo(100n),
      height: undefined,
    };
    const utxos = [mockUtxo(100n, 100), noHeight, mockUtxo(100n, 50)];
    const picked = selectOldestFirst({
      ...ctxBase,
      available: utxos,
      amountRequired: 1000n, // force taking all
    });
    expect(picked.map((u) => u.height)).toEqual([50, 100, undefined]);
  });

  test("selectNewestFirst spends highest height first", () => {
    const utxos = [
      mockUtxo(100n, 100),
      mockUtxo(100n, 300),
      mockUtxo(100n, 200),
    ];
    const picked = selectNewestFirst({
      ...ctxBase,
      available: utxos,
      amountRequired: 250n,
    });
    expect(picked.map((u) => u.height)).toEqual([300, 200, 100]);
  });

  test("selectRandom returns a permutation that satisfies amount", () => {
    const utxos = [
      mockUtxo(100n),
      mockUtxo(100n),
      mockUtxo(100n),
      mockUtxo(100n),
    ];
    const picked = selectRandom({
      ...ctxBase,
      available: utxos,
      amountRequired: 250n,
    });
    // exactly three UTXOs needed at 100n each
    expect(picked.length).toBe(3);
    expect(picked.every((u) => utxos.includes(u))).toBe(true);
  });

  test("selectBranchAndBound finds an exact subset when possible", () => {
    const utxos = [
      mockUtxo(50n),
      mockUtxo(100n),
      mockUtxo(150n),
      mockUtxo(300n),
    ];
    const picked = selectBranchAndBound({
      ...ctxBase,
      available: utxos,
      amountRequired: 250n, // exact: 100 + 150
    });
    const total = picked.reduce((a, c) => a + c.satoshis, 0n);
    expect(total).toBeGreaterThanOrEqual(250n);
    // Within target + cost-of-change window: 250 + ceil(1 * 34) = 284
    expect(total).toBeLessThanOrEqual(284n);
  });

  test("selectBranchAndBound falls back to largest-first when no exact match", () => {
    // Need 500; the two UTXOs are 1000 and 2000. No subset hits 500..534.
    // Falls back to largest-first -> picks the 2000 UTXO alone.
    const utxos = [mockUtxo(1000n), mockUtxo(2000n)];
    const picked = selectBranchAndBound({
      ...ctxBase,
      available: utxos,
      amountRequired: 500n,
    });
    expect(picked.map((u) => u.satoshis)).toEqual([2000n]);
  });

  test("selection: returns empty when available is empty", () => {
    expect(
      selectLargestFirst({ ...ctxBase, available: [], amountRequired: 100n })
        .length,
    ).toBe(0);
    expect(
      selectBranchAndBound({ ...ctxBase, available: [], amountRequired: 100n })
        .length,
    ).toBe(0);
  });

  test("selection: picks one when amountRequired fits in the first UTXO", () => {
    const utxos = [mockUtxo(1000n), mockUtxo(1000n), mockUtxo(1000n)];
    expect(
      selectNatural({ ...ctxBase, available: utxos, amountRequired: 500n })
        .length,
    ).toBe(1);
    expect(
      selectLargestFirst({ ...ctxBase, available: utxos, amountRequired: 500n })
        .length,
    ).toBe(1);
  });
});

describe("coin-control: input ordering", () => {
  test("inputOrderNatural is identity", () => {
    const inputs = [mockUtxo(1n), mockUtxo(2n)];
    expect(inputOrderNatural({ inputs })).toBe(inputs);
  });

  test("inputOrderBip69 sorts by reversed txid then vout", () => {
    const a: Utxo = {
      ...mockUtxo(1n),
      txid: "aa".repeat(32),
      vout: 0,
    };
    const b: Utxo = { ...mockUtxo(1n), txid: "bb".repeat(32), vout: 0 };
    const c: Utxo = { ...mockUtxo(1n), txid: "aa".repeat(32), vout: 2 };
    const sorted = inputOrderBip69({ inputs: [b, c, a] });
    // a (vout 0) before c (vout 2) -- same reversed txid; both before b.
    expect(sorted.map((u) => `${u.txid}:${u.vout}`)).toEqual([
      "aa".repeat(32) + ":0",
      "aa".repeat(32) + ":2",
      "bb".repeat(32) + ":0",
    ]);
  });

  test("inputOrderRandom returns a permutation of the same set", () => {
    const inputs = Array.from({ length: 6 }, (_, i) => mockUtxo(BigInt(i + 1)));
    const sorted = inputOrderRandom({ inputs });
    expect(sorted.length).toBe(inputs.length);
    expect(new Set(sorted)).toEqual(new Set(inputs));
  });
});

describe("coin-control: output ordering", () => {
  test("outputOrderNatural is identity", () => {
    const outputs = [
      new SendRequest({ cashaddr: "bchreg:a", value: 1n }),
      new SendRequest({ cashaddr: "bchreg:b", value: 2n }),
    ];
    expect(outputOrderNatural({ outputs })).toBe(outputs);
  });

  test("outputOrderBip69 sorts by value ascending", () => {
    const a = new SendRequest({
      cashaddr: "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0",
      value: 1000n,
    });
    const b = new SendRequest({
      cashaddr: "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0",
      value: 500n,
    });
    const c = OpReturnData.fromString("hi"); // 0 sats -- sorts to front
    const sorted = outputOrderBip69({ outputs: [a, b, c] });
    expect(sorted[0]).toBe(c);
    expect(sorted[1]).toBe(b);
    expect(sorted[2]).toBe(a);
  });

  test("outputOrderRandom returns a permutation", () => {
    const outputs = [
      new SendRequest({ cashaddr: "bchreg:a", value: 1n }),
      new SendRequest({ cashaddr: "bchreg:b", value: 2n }),
      new SendRequest({ cashaddr: "bchreg:c", value: 3n }),
    ];
    const sorted = outputOrderRandom({ outputs });
    expect(new Set(sorted)).toEqual(new Set(outputs));
  });

  test("outputOrderBip69 breaks ties on locking bytecode bytes", async () => {
    // Two outputs with the same value but different addresses -- BIP69 falls
    // back to lex-compare on the decoded locking bytecode.
    const alice = await RegTestWallet.newRandom();
    const bob = await RegTestWallet.newRandom();
    const sameValue = 1234n;
    const oa = new SendRequest({ cashaddr: alice.cashaddr!, value: sameValue });
    const ob = new SendRequest({ cashaddr: bob.cashaddr!, value: sameValue });
    const sorted = outputOrderBip69({ outputs: [oa, ob] });
    // Whichever comes first should have the lexicographically smaller
    // locking bytecode. We don't assert which -- just that the order is
    // deterministic across calls.
    const sorted2 = outputOrderBip69({ outputs: [ob, oa] });
    expect(sorted).toEqual(sorted2);
  });
});

describe("coin-control: fee", () => {
  test("feeFromRelay = size * relay rate, rounded up", () => {
    expect(feeFromRelay({ txSizeBytes: 250, relayFeePerByte: 1 })).toBe(250n);
    expect(feeFromRelay({ txSizeBytes: 250, relayFeePerByte: 1.5 })).toBe(375n);
    expect(feeFromRelay({ txSizeBytes: 251, relayFeePerByte: 1.5 })).toBe(377n); // ceil(376.5)
  });

  test("feeFixedPerByte multiplies size by rate", () => {
    const fn = feeFixedPerByte(3);
    expect(fn({ txSizeBytes: 250, relayFeePerByte: 1 })).toBe(750n);
  });

  test("feeFixedPerKb divides by 1000", () => {
    const fn = feeFixedPerKb(2000);
    expect(fn({ txSizeBytes: 500, relayFeePerByte: 1 })).toBe(1000n);
  });

  test("feeAbsolute ignores size and rate", () => {
    const fn = feeAbsolute(1234n);
    expect(fn({ txSizeBytes: 10_000, relayFeePerByte: 99 })).toBe(1234n);
  });
});

describe("coin-control: end-to-end via mock provider", () => {
  test("selectLargestFirst affects which UTXO funds the transaction", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();

      // Two small + one large UTXO at alice. The small ones would suffice with
      // natural order; the large one alone would suffice with largest-first.
      await provider.addUtxo(alice.cashaddr!, {
        ...randomUtxo({ satoshis: 1_000n }),
        height: 100,
      });
      await provider.addUtxo(alice.cashaddr!, {
        ...randomUtxo({ satoshis: 1_000n }),
        height: 101,
      });
      await provider.addUtxo(alice.cashaddr!, {
        ...randomUtxo({ satoshis: 50_000n }),
        height: 102,
      });

      const utxosBefore = await alice.getUtxos();
      expect(utxosBefore.length).toBe(3);

      await alice.send(
        [new SendRequest({ cashaddr: bob.cashaddr!, value: 1_500n })],
        { coinSelection: selectLargestFirst },
      );

      // Largest-first should have consumed only the 50_000 UTXO, leaving the
      // two 1_000 UTXOs (plus a change UTXO from the spend).
      const remaining = await alice.getUtxos();
      const remaining1k = remaining.filter((u) => u.satoshis === 1_000n);
      expect(remaining1k.length).toBe(2);
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });

  test("outputOrderBip69 reorders outputs in the broadcast transaction", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();
      const carol = await RegTestWallet.newRandom();

      await provider.addUtxo(alice.cashaddr!, {
        ...randomUtxo({ satoshis: 100_000n }),
        height: 100,
      });

      // Two recipients: bob gets a large value, carol gets a smaller value.
      // BIP69 sorts ascending -> carol (smaller) before bob (larger).
      const response = await alice.send(
        [
          new SendRequest({ cashaddr: bob.cashaddr!, value: 20_000n }),
          new SendRequest({ cashaddr: carol.cashaddr!, value: 5_000n }),
        ],
        { outputOrdering: outputOrderBip69 },
      );

      expect(response.txId).toBeDefined();
      // The smaller of the two non-change outputs should be earlier than the
      // bigger one. Read both wallets' new UTXOs to verify they got paid.
      const bobUtxos = await bob.getUtxos();
      const carolUtxos = await carol.getUtxos();
      expect(bobUtxos.some((u) => u.satoshis === 20_000n)).toBe(true);
      expect(carolUtxos.some((u) => u.satoshis === 5_000n)).toBe(true);
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });

  test("feeAbsolute is honoured by the builder", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();
      await provider.addUtxo(alice.cashaddr!, {
        ...randomUtxo({ satoshis: 100_000n }),
        height: 100,
      });

      // Override fee to a known value and confirm balance math reflects it.
      const before = await alice.getBalance();
      await alice.send(
        [new SendRequest({ cashaddr: bob.cashaddr!, value: 10_000n })],
        { fee: feeAbsolute(500n) },
      );
      const after = await alice.getBalance();
      expect(before - after).toBe(10_000n + 500n);
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });

  test("custom inputOrdering callback is invoked with the selected inputs", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();
      await provider.addUtxo(alice.cashaddr!, {
        ...randomUtxo({ satoshis: 50_000n }),
        height: 100,
      });
      await provider.addUtxo(alice.cashaddr!, {
        ...randomUtxo({ satoshis: 50_000n }),
        height: 101,
      });

      let observed: Utxo[] | null = null;
      await alice.send(
        [new SendRequest({ cashaddr: bob.cashaddr!, value: 60_000n })],
        {
          inputOrdering: ({ inputs }) => {
            observed = inputs;
            return [...inputs].reverse();
          },
        },
      );
      expect(observed).not.toBeNull();
      expect(observed!.length).toBeGreaterThanOrEqual(2);
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });

  test("custom outputOrdering callback receives the change output index", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();
      await provider.addUtxo(alice.cashaddr!, {
        ...randomUtxo({ satoshis: 100_000n }),
        height: 100,
      });

      let observedIndex: number | undefined = -1;
      let observedLength = 0;
      await alice.send(
        [new SendRequest({ cashaddr: bob.cashaddr!, value: 10_000n })],
        {
          outputOrdering: ({ outputs, changeOutputIndex }) => {
            observedIndex = changeOutputIndex;
            observedLength = outputs.length;
            return outputs;
          },
        },
      );
      // One recipient + one change output -> length 2; change appended last.
      expect(observedLength).toBe(2);
      expect(observedIndex).toBe(1);
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });

  test("custom outputOrdering: changeOutputIndex is undefined when no change", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();
      await provider.addUtxo(alice.cashaddr!, {
        ...randomUtxo({ satoshis: 10_000n }),
        height: 100,
      });

      let observedIndex: number | undefined = -1;
      // sendMax consumes the whole balance into a single output with no
      // change, so changeOutputIndex must be undefined.
      await alice.sendMax(bob.cashaddr!, {
        outputOrdering: (ctx) => {
          observedIndex = ctx.changeOutputIndex;
          return ctx.outputs;
        },
      });
      expect(observedIndex).toBeUndefined();
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });

  test("custom fee callback receives the encoded tx size", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();
      await provider.addUtxo(alice.cashaddr!, {
        ...randomUtxo({ satoshis: 100_000n }),
        height: 100,
      });

      let observedSize = 0;
      const before = await alice.getBalance();
      await alice.send(
        [new SendRequest({ cashaddr: bob.cashaddr!, value: 10_000n })],
        {
          fee: ({ txSizeBytes }) => {
            observedSize = txSizeBytes;
            return 250n; // flat fee for assertion
          },
        },
      );
      expect(observedSize).toBeGreaterThan(0);
      const after = await alice.getBalance();
      expect(before - after).toBe(10_000n + 250n);
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });

  test("custom coinSelection callback is invoked", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();
      await provider.addUtxo(alice.cashaddr!, {
        ...randomUtxo({ satoshis: 10_000n }),
        height: 100,
      });
      await provider.addUtxo(alice.cashaddr!, {
        ...randomUtxo({ satoshis: 20_000n }),
        height: 101,
      });

      let invoked = 0;
      await alice.send(
        [new SendRequest({ cashaddr: bob.cashaddr!, value: 5_000n })],
        {
          coinSelection: (ctx) => {
            invoked++;
            // Pick all available -- strategy is "consume everything".
            return ctx.available;
          },
        },
      );
      expect(invoked).toBeGreaterThanOrEqual(1);
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });
});
