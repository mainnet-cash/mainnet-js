import { webSocket } from "@rpckit/websocket/electrum-cash";
import { createProvider, setGlobalProvider, removeGlobalProvider } from ".";
import { Network } from "../interface";
import type { Transport, Unsubscribe } from "@rpckit/core";
import type { ElectrumCashSchema } from "@rpckit/core/electrum-cash";
import { Wallet } from "../wallet/Wif";

describe("Provider subscription: blockchain.transaction.subscribe", () => {
  let provider: Awaited<ReturnType<typeof createProvider>>;

  beforeAll(async () => {
    provider = await createProvider(Network.MAINNET);
  });

  afterAll(async () => {
    await provider.disconnect();
  });

  test("Should receive initial confirmation count for confirmed transaction", async () => {
    // A well-known confirmed BCH transaction
    const txHash = "4db095f34d632a4daf942142c291f1f2abb5ba2e1ccac919d85bdc2f671fb251";

    const received: Array<[string, number | null]> = [];
    const cancel = await provider.subscribeToTransaction(txHash, (data) => {
      received.push(data);
    });

    // Wait a short time for the initial result to arrive
    await new Promise((r) => setTimeout(r, 100));

    expect(received.length).toBeGreaterThanOrEqual(1);
    // Initial result should be [txHash, confirmations]
    expect(received[0][0]).toBe(txHash);
    expect(received[0][1]).toBeGreaterThan(0); // Confirmed transaction has > 0 confirmations

    await cancel();
  });

  test("Should receive null for unconfirmed/unknown transaction", async () => {
    // A made-up transaction hash that doesn't exist
    const fakeTxHash = "0000000000000000000000000000000000000000000000000000000000000000";

    const received: Array<[string, number | null]> = [];
    const cancel = await provider.subscribeToTransaction(fakeTxHash, (data) => {
      received.push(data);
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(received.length).toBeGreaterThanOrEqual(1);
    // Unknown transaction should return [txHash, null]
    expect(received[0][0]).toBe(fakeTxHash);
    expect(received[0][1]).toBeNull();

    await cancel();
  });
});

describe("Provider subscription: blockchain.address.subscribe", () => {
  let provider: Awaited<ReturnType<typeof createProvider>>;

  beforeAll(async () => {
    provider = await createProvider(Network.MAINNET);
  });

  afterAll(async () => {
    await provider.disconnect();
  });

  test("Should receive initial status for address with history", async () => {
    // The Bitcoin genesis address (has transaction history)
    const address = "bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy";

    const received: Array<[string, string | null]> = [];
    const cancel = await provider.subscribeToAddress(address, (data) => {
      received.push(data);
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(received.length).toBeGreaterThanOrEqual(1);
    // Initial result should be [address, status_hash]
    expect(received[0][0]).toBe(address);
    expect(received[0][1]).not.toBeNull(); // Address with history has a status hash
    expect(typeof received[0][1]).toBe("string");

    await cancel();
  });

  test("Should receive null status for unused address", async () => {
    // A valid but never-used address (generated from random pubkey hash)
    // Using a standard P2PKH address with unlikely-to-be-used hash
    const unusedAddress = "bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy";

    const received: Array<[string, string | null]> = [];
    const cancel = await provider.subscribeToAddress(unusedAddress, (data) => {
      received.push(data);
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(received.length).toBeGreaterThanOrEqual(1);
    // Unused address should have null status
    expect(received[0][0]).toBe(unusedAddress);
    expect(received[0][1]).toBeNull();

    await cancel();
  });
});

describe("Provider subscription: blockchain.headers.subscribe", () => {
  let provider: Awaited<ReturnType<typeof createProvider>>;

  beforeAll(async () => {
    provider = await createProvider(Network.MAINNET);
  });

  afterAll(async () => {
    await provider.disconnect();
  });

  test("Should receive initial block header", async () => {
    const received: Array<{ height: number; hex: string }> = [];
    const cancel = await provider.subscribeToHeaders((header) => {
      received.push(header);
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(received.length).toBeGreaterThanOrEqual(1);
    // Header should have height and hex
    expect(received[0].height).toBeGreaterThan(800000);
    expect(typeof received[0].hex).toBe("string");
    expect(received[0].hex.length).toBeGreaterThan(0);

    await cancel();
  });
});

describe("Raw transport subscription format", () => {
  let transport: Transport<ElectrumCashSchema>;

  beforeAll(async () => {
    transport = webSocket("wss://fulcrum.pat.mn:50004");
    await transport.connect();
  });

  afterAll(async () => {
    await transport.close();
  });

  test("blockchain.transaction.subscribe returns [txHash, confirmations] format", async () => {
    const txHash = "4db095f34d632a4daf942142c291f1f2abb5ba2e1ccac919d85bdc2f671fb251";

    const received: unknown[] = [];
    const unsub: Unsubscribe = await transport.subscribe(
      "blockchain.transaction.subscribe",
      txHash,
      (data) => {
        received.push(data);
      }
    );

    await new Promise((r) => setTimeout(r, 100));

    expect(received.length).toBeGreaterThanOrEqual(1);
    // With transformInitialResult, format should be [txHash, confirmations]
    const data = received[0] as [string, number | null];
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toBe(txHash);
    expect(typeof data[1]).toBe("number");

    await unsub();
  });

  test("blockchain.address.subscribe returns [address, status] format", async () => {
    const address = "bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy";

    const received: unknown[] = [];
    const unsub: Unsubscribe = await transport.subscribe(
      "blockchain.address.subscribe",
      address,
      (data) => {
        received.push(data);
      }
    );

    await new Promise((r) => setTimeout(r, 100));

    expect(received.length).toBeGreaterThanOrEqual(1);
    // With transformInitialResult, format should be [address, status]
    const data = received[0] as [string, string | null];
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toBe(address);
    expect(typeof data[1]).toBe("string");

    await unsub();
  });

  test("blockchain.headers.subscribe returns [header] format", async () => {
    const received: unknown[] = [];
    const unsub: Unsubscribe = await transport.subscribe(
      "blockchain.headers.subscribe",
      (data) => {
        received.push(data);
      }
    );

    await new Promise((r) => setTimeout(r, 100));

    expect(received.length).toBeGreaterThanOrEqual(1);
    // With transformInitialResult (no params), format should be [header]
    const data = received[0] as [{ height: number; hex: string }];
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].height).toBeGreaterThan(800000);
    expect(typeof data[0].hex).toBe("string");

    await unsub();
  });
});

describe("Wallet waitForTransaction with specific txHash", () => {
  let wallet: Wallet;
  let provider: Awaited<ReturnType<typeof createProvider>>;

  beforeAll(async () => {
    // Create provider for mainnet and set it globally
    provider = await createProvider(Network.MAINNET);
    await provider.connect();
    setGlobalProvider(Network.MAINNET, provider);

    // Create a mainnet wallet using the global provider
    wallet = await Wallet.watchOnly(
      "bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy"
    );
  });

  afterAll(async () => {
    removeGlobalProvider(Network.MAINNET);
    await provider?.disconnect();
  });

  test("Should resolve immediately for confirmed transaction", async () => {
    // A well-known confirmed BCH transaction
    const txHash = "4db095f34d632a4daf942142c291f1f2abb5ba2e1ccac919d85bdc2f671fb251";

    // waitForTransaction with a specific txHash should resolve when confirmations > 0
    const result = await Promise.race([
      wallet.waitForTransaction({
        txHash,
        getTransactionInfo: true,
        getBalance: false,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000)
      ),
    ]);

    expect(result).toBeDefined();
    expect((result as any).transactionInfo).toBeDefined();
    expect((result as any).transactionInfo.hash).toBe(txHash);
  });
});
