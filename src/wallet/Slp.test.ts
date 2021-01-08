import { RegTestWallet, Wallet } from "../wallet/Wif";

import { Network } from "..";
import { disconnectProviders, initProviders } from "../network";

import { mine } from "../mine";

import { SlpGenesisOptions, SlpGenesisResult } from "../slp/interface";
import { DUST_UTXO_THRESHOLD } from "../constant";

describe("Slp wallet tests", () => {
  beforeAll(async () => {
    await initProviders([Network.MAINNET, Network.REGTEST]);
  });

  afterAll(async () => {
    await disconnectProviders([Network.MAINNET, Network.REGTEST]);
  });

  let ticker: string = Math.random().toString(36).substring(8).toUpperCase();
  let tokenId: string;

  const genesisOptions: SlpGenesisOptions = {
    name: "Mainnet coin",
    ticker: ticker,
    decimalPlaces: 2,
    initialAmount: 10000,
    documentUrl: "https://mainnet.cash",
    documentHash:
      "0000000000000000000000000000000000000000000000000000000000000000",
  };

  test("Genesis test", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);

    const result: SlpGenesisResult = await aliceWallet.slp.genesis(
      genesisOptions
    );

    tokenId = result.tokenId;
    expect(result.balances.length).toBe(1);
    expect(result.balances[0].amount.isEqualTo(10000));
    expect(result.balances[0].name).toBe("Mainnet coin");
    expect(result.balances[0].ticker).toBe(ticker);
    expect(result.balances[0].tokenId).toBe(tokenId);
  });

  test("Genesis test, utxos are not suitable", async () => {
    const bobWallet = await RegTestWallet.newRandom();
    await mine({ cashaddr: bobWallet.cashaddr!, blocks: 5 });
    await expect(bobWallet.slp.genesis(genesisOptions)).rejects.toThrow();
  });

  test("Send test", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();

    let result = await aliceWallet.slp.send([
      {
        cashaddr: bobWallet.slp.cashaddr,
        value: 5,
        ticker: ticker,
        tokenId: tokenId,
      },
    ]);

    expect(result.balances.length).toBe(1);
    expect(result.balances[0].amount.isEqualTo(9995));
    expect(result.balances[0].name).toBe("Mainnet coin");
    expect(result.balances[0].ticker).toBe(ticker);
    expect(result.balances[0].tokenId).toBe(tokenId);

    expect(await bobWallet.slpAware(false).getBalance("satoshi")).toBe(
      DUST_UTXO_THRESHOLD
    );
    expect(await bobWallet.slpAware().getBalance("satoshi")).toBe(0);
    let bobBalances = await bobWallet.slp.getBalance();
    expect(bobBalances.length).toBe(1);
    expect(bobBalances[0].amount.isEqualTo(5));
    expect(bobBalances[0].name).toBe("Mainnet coin");
    expect(bobBalances[0].ticker).toBe(ticker);
    expect(bobBalances[0].tokenId).toBe(tokenId);

    // send without token id
    result = await aliceWallet.slp.send([
      { cashaddr: bobWallet.slp.cashaddr, value: 5, ticker: ticker },
    ]);

    expect(result.balances.length).toBe(1);
    expect(result.balances[0].amount.isEqualTo(9990));
    expect(result.balances[0].name).toBe("Mainnet coin");
    expect(result.balances[0].ticker).toBe(ticker);
    expect(result.balances[0].tokenId).toBe(tokenId);

    expect(await bobWallet.slpAware(false).getBalance("satoshi")).toBe(
      2 * DUST_UTXO_THRESHOLD
    );
    expect(await bobWallet.slpAware().getBalance("satoshi")).toBe(0);
    bobBalances = await bobWallet.slp.getBalance();
    expect(bobBalances.length).toBe(1);
    expect(bobBalances[0].amount.isEqualTo(10));
    expect(bobBalances[0].name).toBe("Mainnet coin");
    expect(bobBalances[0].ticker).toBe(ticker);
    expect(bobBalances[0].tokenId).toBe(tokenId);

    // send twice to bob
    result = await aliceWallet.slp.send([
      { cashaddr: bobWallet.slp.cashaddr, value: 5, ticker: ticker },
      { cashaddr: bobWallet.slp.cashaddr, value: 5, ticker: ticker },
    ]);

    expect(result.balances.length).toBe(1);
    expect(result.balances[0].amount.isEqualTo(9980));
    expect(result.balances[0].name).toBe("Mainnet coin");
    expect(result.balances[0].ticker).toBe(ticker);
    expect(result.balances[0].tokenId).toBe(tokenId);

    expect(await bobWallet.slpAware(false).getBalance("satoshi")).toBe(
      4 * DUST_UTXO_THRESHOLD
    );
    expect(await bobWallet.slpAware().getBalance("satoshi")).toBe(0);
    bobBalances = await bobWallet.slp.getBalance();
    expect(bobBalances.length).toBe(1);
    expect(bobBalances[0].amount.isEqualTo(20));
    expect(bobBalances[0].name).toBe("Mainnet coin");
    expect(bobBalances[0].ticker).toBe(ticker);
    expect(bobBalances[0].tokenId).toBe(tokenId);

    // send to bob and charlie
    const charlieWallet = await RegTestWallet.newRandom();
    result = await aliceWallet.slp.send([
      { cashaddr: bobWallet.slp.cashaddr, value: 5, ticker: ticker },
      { cashaddr: charlieWallet.slp.cashaddr, value: 5, ticker: ticker },
    ]);

    expect(result.balances.length).toBe(1);
    expect(result.balances[0].amount.isEqualTo(9970));
    expect(result.balances[0].name).toBe("Mainnet coin");
    expect(result.balances[0].ticker).toBe(ticker);
    expect(result.balances[0].tokenId).toBe(tokenId);

    expect(await bobWallet.slpAware(false).getBalance("satoshi")).toBe(
      5 * DUST_UTXO_THRESHOLD
    );
    expect(await bobWallet.slpAware().getBalance("satoshi")).toBe(0);
    bobBalances = await bobWallet.slp.getBalance();
    expect(bobBalances.length).toBe(1);
    expect(bobBalances[0].amount.isEqualTo(25));
    expect(bobBalances[0].name).toBe("Mainnet coin");
    expect(bobBalances[0].ticker).toBe(ticker);
    expect(bobBalances[0].tokenId).toBe(tokenId);

    expect(await charlieWallet.slpAware(false).getBalance("satoshi")).toBe(
      1 * DUST_UTXO_THRESHOLD
    );
    expect(await charlieWallet.slpAware().getBalance("satoshi")).toBe(0);
    const charlieBalances = await charlieWallet.slp.getBalance();
    expect(charlieBalances.length).toBe(1);
    expect(charlieBalances[0].amount.isEqualTo(25));
    expect(charlieBalances[0].name).toBe("Mainnet coin");
    expect(charlieBalances[0].ticker).toBe(ticker);
    expect(charlieBalances[0].tokenId).toBe(tokenId);
  });

  test("Mint test", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);

    // can not mint less than or 0 tokens
    await expect(aliceWallet.slp.mint(-1, ticker)).rejects.toThrow();

    let result = await aliceWallet.slp.mint(50, ticker);
    expect(result.balances.length).toBe(1);
    expect(result.balances[0].amount.isEqualTo(10040));
    expect(result.balances[0].name).toBe("Mainnet coin");
    expect(result.balances[0].ticker).toBe(ticker);
    expect(result.balances[0].tokenId).toBe(tokenId);

    // the baton must survive the first mint, and we end it now
    result = await aliceWallet.slp.mint(50, ticker, undefined, true);
    expect(result.balances.length).toBe(1);
    expect(result.balances[0].amount.isEqualTo(10090));
    expect(result.balances[0].name).toBe("Mainnet coin");
    expect(result.balances[0].ticker).toBe(ticker);
    expect(result.balances[0].tokenId).toBe(tokenId);

    // can not mint after baton is burnt
    await expect(aliceWallet.slp.mint(50, ticker)).rejects.toThrow();
  });

  test("Test Ticker ambiguity", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);

    await mine({ cashaddr: aliceWallet.cashaddr!, blocks: 1 });

    genesisOptions.ticker = ticker + "_AMBIGUOS";
    const genesis1: SlpGenesisResult = await aliceWallet.slp.genesis(
      genesisOptions
    );
    const genesis2: SlpGenesisResult = await aliceWallet.slp.genesis(
      genesisOptions
    );

    await expect(aliceWallet.slp.send([])).rejects.toThrow();
    await expect(
      aliceWallet.slp.send([
        {
          cashaddr: aliceWallet.slp.cashaddr,
          ticker: genesisOptions.ticker,
          value: 0,
        },
      ])
    ).rejects.toThrow();
    await expect(
      aliceWallet.slp.send([
        {
          cashaddr: aliceWallet.slp.cashaddr,
          ticker: genesisOptions.ticker,
          value: 10,
        },
      ])
    ).rejects.toThrow();
    await expect(
      aliceWallet.slp.send([
        {
          cashaddr: aliceWallet.slp.cashaddr,
          ticker: genesisOptions.ticker,
          value: 10,
        },
      ])
    ).rejects.toThrow();
    await expect(
      aliceWallet.slp.send([
        {
          cashaddr: aliceWallet.slp.cashaddr,
          ticker: genesisOptions.ticker,
          value: 10,
        },
      ])
    ).rejects.toThrow();
    await expect(
      aliceWallet.slp.send([
        {
          cashaddr: aliceWallet.slp.cashaddr,
          ticker: genesisOptions.ticker,
          value: 10,
          tokenId: genesis1.tokenId,
        },
        {
          cashaddr: aliceWallet.slp.cashaddr,
          ticker: genesisOptions.ticker,
          value: 10,
          tokenId: genesis2.tokenId,
        },
      ])
    ).rejects.toThrow();

    await expect(
      aliceWallet.slp.send([
        { cashaddr: aliceWallet.slp.cashaddr, ticker: "ABC", value: 10 },
        { cashaddr: aliceWallet.slp.cashaddr, ticker: "DEF", value: 10 },
      ])
    ).rejects.toThrow();

    await expect(
      aliceWallet.slp.mint(50, genesisOptions.ticker)
    ).rejects.toThrow();
    const result = await aliceWallet.slp.mint(
      50,
      genesisOptions.ticker,
      genesis1.tokenId
    );
    expect(result.balances.length).toBe(1);
    expect(result.balances[0].amount.isEqualTo(10050));
    expect(result.balances[0].name).toBe("Mainnet coin");
    expect(result.balances[0].ticker).toBe(genesisOptions.ticker);
    expect(result.balances[0].tokenId).toBe(genesis1.tokenId);
  });

  test("Test watching slp balance", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();

    await mine({ cashaddr: aliceWallet.cashaddr!, blocks: 1 });

    genesisOptions.ticker = ticker + "WB";
    const genesis: SlpGenesisResult = await aliceWallet.slp.genesis(
      genesisOptions
    );
    bobWallet.slp.watchBalance((balance) => {
      expect(balance.length).toBeGreaterThan(0);
    });
    await aliceWallet.slp.send([
      {
        cashaddr: bobWallet.slp.cashaddr,
        ticker: genesisOptions.ticker,
        value: 10,
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  test("Test waiting for slp certain balance", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();

    await mine({ cashaddr: aliceWallet.cashaddr!, blocks: 1 });

    genesisOptions.ticker = ticker + "_WFB";
    const genesis: SlpGenesisResult = await aliceWallet.slp.genesis(
      genesisOptions
    );
    setTimeout(async () => {
      await aliceWallet.slp.send([
        {
          cashaddr: bobWallet.slp.cashaddr,
          ticker: genesisOptions.ticker,
          value: 20,
        },
      ]);
    }, 5000);
    const balance = await bobWallet.slp.waitForBalance(
      10,
      genesisOptions.ticker
    );
    expect(balance.amount.isEqualTo(20));
  });

  test("Test waiting for slp transaction", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();

    genesisOptions.ticker = ticker + "_WT";
    const genesis: SlpGenesisResult = await aliceWallet.slp.genesis(
      genesisOptions
    );
    setTimeout(async () => {
      await aliceWallet.slp.send([
        {
          cashaddr: bobWallet.slp.cashaddr,
          ticker: genesisOptions.ticker,
          value: 20,
        },
      ]);
    }, 5000);
    const transaction = await bobWallet.slp.waitForTransaction(
      genesisOptions.ticker
    );
    expect(transaction.tx.h.length).toBe(64);
  });

  test("Test getting history", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);

    await mine({ cashaddr: aliceWallet.cashaddr!, blocks: 1 });

    const history = await aliceWallet.slp.getHistory();
    expect(history.length).toBeGreaterThan(0);

    const lastTx = await aliceWallet.slp.getLastTransaction(true);
    expect(lastTx.txid.length).toBe(64);
  });

  test("Test utilities", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);

    expect(aliceWallet.slp.getDepositAddress()).toContain("slp");
    expect(aliceWallet.slp.getDepositQr().src).toContain("data:image");
  });

  test("Test faulty wallet", async () => {
    const bobWallet = await RegTestWallet.newRandom();
    bobWallet.privateKey = Uint8Array.from([0, 1, 2, 3, 4]);
    // not enough funds
    await expect(bobWallet.slp.genesis(genesisOptions)).rejects.toThrow();

    // no private key set
    bobWallet.privateKey = undefined;
    await expect(bobWallet.slp.genesis(genesisOptions)).rejects.toThrow();
    bobWallet.privateKey = Uint8Array.from([0, 1, 2, 3, 4]);

    // no network provider set
    const provider = bobWallet.provider;
    bobWallet.provider = undefined;
    await expect(bobWallet.slp.genesis(genesisOptions)).rejects.toThrow();
    bobWallet.provider = provider;

    // cashaddr is bad
    bobWallet.slp.cashaddr = "";
    await expect(bobWallet.slp.genesis(genesisOptions)).rejects.toThrow();
  });

  test("Test genesis ends baton", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();

    await mine({ cashaddr: aliceWallet.cashaddr!, blocks: 1 });

    genesisOptions.ticker = ticker + "baton_end";
    genesisOptions.documentUrl = undefined;
    genesisOptions.documentHash = undefined;
    genesisOptions.endBaton = true;
    const result: SlpGenesisResult = await aliceWallet.slp.genesis(
      genesisOptions
    );

    tokenId = result.tokenId;

    await expect(
      aliceWallet.slp.mint(100, genesisOptions.ticker, tokenId, false)
    ).rejects.toThrow();
  });
});
