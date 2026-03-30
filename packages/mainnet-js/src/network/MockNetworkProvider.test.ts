import { MockNetworkProvider } from "./MockNetworkProvider";
import { randomUtxo, randomToken, randomNFT } from "@mem-cash/electrum";
import { RegTestWallet } from "../wallet/Wif";
import { setGlobalProvider, removeGlobalProvider } from ".";
import { Network } from "../interface";
import { SendRequest, TokenSendRequest } from "../wallet/model";

/** Fund a wallet with a UTXO in the mock provider. */
async function fundWallet(
  provider: MockNetworkProvider,
  address: string,
  satoshis: bigint,
  options?: { vout?: number; height?: number; token?: any }
) {
  await provider.addUtxo(address, {
    ...randomUtxo({
      vout: options?.vout ?? 0,
      satoshis,
      token: options?.token,
    }),
    height: options?.height ?? 100,
  });
}

describe("MockNetworkProvider", () => {
  // --- Basic state management ---

  test("should get balance", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    const address = "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0";

    await provider.addUtxo(address, randomUtxo({ satoshis: 50000n }));
    await provider.addUtxo(address, randomUtxo({ satoshis: 30000n }));

    const balance = await provider.getBalance(address);
    expect(balance).toBe(80000n);
  });

  test("should get utxos", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    const address = "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0";

    await provider.addUtxo(address, randomUtxo({ satoshis: 10000n }));
    await provider.addUtxo(address, randomUtxo({ satoshis: 20000n }));

    const utxos = await provider.getUtxos(address);
    expect(utxos.length).toBe(2);
  });

  test("should get utxos with tokens", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    const address = "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0";

    await provider.addUtxo(
      address,
      randomUtxo({ satoshis: 1000n, token: randomToken({ amount: 500n }) })
    );
    await provider.addUtxo(
      address,
      randomUtxo({ satoshis: 1000n, token: randomNFT() })
    );

    const utxos = await provider.getUtxos(address);
    expect(utxos.length).toBe(2);
    expect(utxos[0].token).toBeDefined();
    expect(utxos[0].token!.amount).toBe(500n);
    expect(utxos[1].token!.nft).toBeDefined();
  });

  test("should subscribe to address and receive initial status", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    const address = "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0";

    const received: Array<[string, string | null]> = [];
    const cancel = await provider.subscribeToAddress(address, (data) => {
      received.push(data);
    });

    expect(received.length).toBe(1);
    expect(received[0][0]).toBe(address);
    expect(received[0][1]).toBeNull();

    await cancel();
  });

  test("should subscribe and get non-null status when funded", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    const address = "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0";

    await provider.addUtxo(address, randomUtxo({ satoshis: 50000n }));

    const received: Array<[string, string | null]> = [];
    const cancel = await provider.subscribeToAddress(address, (data) => {
      received.push(data);
    });

    expect(received.length).toBe(1);
    expect(received[0][1]).not.toBeNull();

    await cancel();
  });

  test("should get history", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    const address = "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0";

    await provider.addUtxo(address, { ...randomUtxo({ satoshis: 50000n }), height: 100 });
    await provider.addUtxo(address, { ...randomUtxo({ satoshis: 30000n }), height: 150 });

    const history = await provider.getHistory(address);
    expect(history.length).toBe(2);
  });

  test("should get block height and header", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    await provider.setBlockHeight(300);

    const height = await provider.getBlockHeight();
    expect(height).toBe(300);

    const header = await provider.getHeader(300);
    expect((header as any).height).toBe(300);
  });

  test("should reset state", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    const address = "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0";

    await provider.addUtxo(address, randomUtxo());
    expect((await provider.getUtxos(address)).length).toBe(1);

    await provider.reset();
    expect((await provider.getUtxos(address)).length).toBe(0);
  });

  test("should work as global provider for wallets", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const address = "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0";
      await provider.addUtxo(address, randomUtxo({ satoshis: 100000n }));

      const wallet = await RegTestWallet.watchOnly(address);
      const balance = await wallet.getBalance();
      expect(balance).toBe(100000n);

      await wallet.stop();
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });

  test("should get relay fee", async () => {
    const provider = new MockNetworkProvider();
    const fee = await provider.getRelayFee();
    expect(typeof fee).toBe("number");
    expect(fee).toBeGreaterThan(0);
  });

  // --- Transaction sending with validation ---

  test("should send BCH between wallets", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      // Create wallets first (sets up subscriptions), then fund
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();

      await fundWallet(provider, alice.cashaddr!, 100_000n);

      expect(await alice.getBalance()).toBe(100_000n);
      expect(await bob.getBalance()).toBe(0n);

      const response = await alice.send([
        new SendRequest({ cashaddr: bob.cashaddr!, value: 50_000n }),
      ]);

      expect(response.txId).toBeDefined();
      expect(response.txId!.length).toBe(64);

      expect(await bob.getBalance()).toBeGreaterThanOrEqual(50_000n);
      expect(await alice.getBalance()).toBeLessThan(100_000n);
      expect(await alice.getBalance()).toBeGreaterThan(0n);

      await alice.stop();
      await bob.stop();
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });

  test("should send multiple outputs", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();
      const charlie = await RegTestWallet.newRandom();

      await fundWallet(provider, alice.cashaddr!, 200_000n);

      const response = await alice.send([
        new SendRequest({ cashaddr: bob.cashaddr!, value: 50_000n }),
        new SendRequest({ cashaddr: charlie.cashaddr!, value: 30_000n }),
      ]);

      expect(response.txId).toBeDefined();
      expect(await bob.getBalance()).toBeGreaterThanOrEqual(50_000n);
      expect(await charlie.getBalance()).toBeGreaterThanOrEqual(30_000n);

      await alice.stop();
      await bob.stop();
      await charlie.stop();
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });

  test("should chain transactions (send, then send again)", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();

      await fundWallet(provider, alice.cashaddr!, 100_000n);

      // First send: alice → bob
      await alice.send([
        new SendRequest({ cashaddr: bob.cashaddr!, value: 80_000n }),
      ]);

      expect(await bob.getBalance()).toBeGreaterThanOrEqual(80_000n);

      // Second send: bob → alice (using the output from first send)
      await bob.send([
        new SendRequest({ cashaddr: alice.cashaddr!, value: 40_000n }),
      ]);

      expect(await alice.getBalance()).toBeGreaterThanOrEqual(40_000n);
      expect(await bob.getBalance()).toBeGreaterThan(0n);

      await alice.stop();
      await bob.stop();
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });

  test("should reject invalid transactions", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();

    await expect(
      provider.sendRawTransaction("deadbeef")
    ).rejects.toThrow();
  });

  test("should send fungible tokens", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();

      // Fund alice — need vout=0 for token genesis
      await fundWallet(provider, alice.cashaddr!, 100_000n);

      // Genesis: create 1000 fungible tokens
      const genesisResponse = await alice.tokenGenesis({ amount: 1000n });

      expect(genesisResponse.txId).toBeDefined();
      const category = genesisResponse.categories![0];
      expect(category).toBeDefined();

      expect(await alice.getTokenBalance(category)).toBe(1000n);

      // Send 300 tokens to bob
      await alice.send([
        new TokenSendRequest({
          cashaddr: bob.cashaddr!,
          amount: 300n,
          category,
        }),
      ]);

      expect(await alice.getTokenBalance(category)).toBe(700n);
      expect(await bob.getTokenBalance(category)).toBe(300n);

      await alice.stop();
      await bob.stop();
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });

  test("should send NFTs", async () => {
    const provider = new MockNetworkProvider();
    await provider.ready();
    setGlobalProvider(Network.REGTEST, provider);

    try {
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();

      await fundWallet(provider, alice.cashaddr!, 100_000n);

      // Genesis: create an immutable NFT
      const genesisResponse = await alice.tokenGenesis({
        amount: 0n,
        nft: { capability: "none", commitment: "cafe" },
      });

      const category = genesisResponse.categories![0];
      expect(await alice.getNftTokenBalance(category)).toBe(1);

      // Send the NFT to bob
      await alice.send([
        new TokenSendRequest({
          cashaddr: bob.cashaddr!,
          amount: 0n,
          category,
          nft: { capability: "none", commitment: "cafe" },
        }),
      ]);

      expect(await alice.getNftTokenBalance(category)).toBe(0);
      expect(await bob.getNftTokenBalance(category)).toBe(1);

      await alice.stop();
      await bob.stop();
    } finally {
      removeGlobalProvider(Network.REGTEST);
    }
  });
});
