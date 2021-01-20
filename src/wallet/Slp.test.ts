import { RegTestWallet } from "../wallet/Wif";

import { Network } from "..";
import { disconnectProviders, initProviders } from "../network";

import { mine } from "../mine";

import { SlpGenesisOptions, SlpGenesisResult } from "../slp/interface";
import { DUST_UTXO_THRESHOLD } from "../constant";
import { ElectrumRawTransaction } from "../network/interface";
import { delay } from "../util/delay";

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
    decimals: 2,
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
    expect(result.balance.value.isEqualTo(10000));
    expect(result.balance.name).toBe("Mainnet coin");
    expect(result.balance.ticker).toBe(ticker);
    expect(result.balance.tokenId).toBe(tokenId);

    const info = await aliceWallet.slp.getTokenInfo(tokenId);
    delete (info as any).tokenId;
    expect(info).toEqual(genesisOptions);
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
        slpaddr: bobWallet.slp.slpaddr,
        value: 5,
        tokenId: tokenId,
      },
    ]);

    expect(result.balance.value.isEqualTo(9995));
    expect(result.balance.name).toBe("Mainnet coin");
    expect(result.balance.ticker).toBe(ticker);
    expect(result.balance.tokenId).toBe(tokenId);

    expect(await bobWallet.slpAware(false).getBalance("satoshi")).toBe(
      DUST_UTXO_THRESHOLD
    );
    expect(await bobWallet.slpAware().getBalance("satoshi")).toBe(0);
    let bobBalance = await bobWallet.slp.getBalance(tokenId);
    expect(bobBalance.value.isEqualTo(5));
    expect(bobBalance.name).toBe("Mainnet coin");
    expect(bobBalance.ticker).toBe(ticker);
    expect(bobBalance.tokenId).toBe(tokenId);

    // send without token id
    result = await aliceWallet.slp.send([
      { slpaddr: bobWallet.slp.slpaddr, value: 5, tokenId: tokenId },
    ]);

    expect(result.balance.value.isEqualTo(9990));
    expect(result.balance.name).toBe("Mainnet coin");
    expect(result.balance.ticker).toBe(ticker);
    expect(result.balance.tokenId).toBe(tokenId);

    expect(await bobWallet.slpAware(false).getBalance("satoshi")).toBe(
      2 * DUST_UTXO_THRESHOLD
    );
    expect(await bobWallet.slpAware().getBalance("satoshi")).toBe(0);
    bobBalance = await bobWallet.slp.getBalance(tokenId);
    expect(bobBalance.value.isEqualTo(10));
    expect(bobBalance.name).toBe("Mainnet coin");
    expect(bobBalance.ticker).toBe(ticker);
    expect(bobBalance.tokenId).toBe(tokenId);

    // send twice to bob
    result = await aliceWallet.slp.send([
      { slpaddr: bobWallet.slp.slpaddr, value: 5, tokenId: tokenId },
      { slpaddr: bobWallet.slp.slpaddr, value: 5, tokenId: tokenId },
    ]);

    expect(result.balance.value.isEqualTo(9980));
    expect(result.balance.name).toBe("Mainnet coin");
    expect(result.balance.ticker).toBe(ticker);
    expect(result.balance.tokenId).toBe(tokenId);

    expect(await bobWallet.slpAware(false).getBalance("satoshi")).toBe(
      4 * DUST_UTXO_THRESHOLD
    );
    expect(await bobWallet.slpAware().getBalance("satoshi")).toBe(0);
    bobBalance = await bobWallet.slp.getBalance(tokenId);
    expect(bobBalance.value.isEqualTo(20));
    expect(bobBalance.name).toBe("Mainnet coin");
    expect(bobBalance.ticker).toBe(ticker);
    expect(bobBalance.tokenId).toBe(tokenId);

    // send to bob and charlie
    const charlieWallet = await RegTestWallet.newRandom();
    result = await aliceWallet.slp.send([
      { slpaddr: bobWallet.slp.slpaddr, value: 5, tokenId: tokenId },
      { slpaddr: charlieWallet.slp.slpaddr, value: 5, tokenId: tokenId },
    ]);

    expect(result.balance.value.isEqualTo(9970));
    expect(result.balance.name).toBe("Mainnet coin");
    expect(result.balance.ticker).toBe(ticker);
    expect(result.balance.tokenId).toBe(tokenId);

    expect(await bobWallet.slpAware(false).getBalance("satoshi")).toBe(
      5 * DUST_UTXO_THRESHOLD
    );
    expect(await bobWallet.slpAware().getBalance("satoshi")).toBe(0);
    bobBalance = await bobWallet.slp.getBalance(tokenId);
    expect(bobBalance.value.isEqualTo(25));
    expect(bobBalance.name).toBe("Mainnet coin");
    expect(bobBalance.ticker).toBe(ticker);
    expect(bobBalance.tokenId).toBe(tokenId);

    expect(await charlieWallet.slpAware(false).getBalance("satoshi")).toBe(
      1 * DUST_UTXO_THRESHOLD
    );
    expect(await charlieWallet.slpAware().getBalance("satoshi")).toBe(0);
    const charlieBalance = await charlieWallet.slp.getBalance(tokenId);
    expect(charlieBalance.value.isEqualTo(25));
    expect(charlieBalance.name).toBe("Mainnet coin");
    expect(charlieBalance.ticker).toBe(ticker);
    expect(charlieBalance.tokenId).toBe(tokenId);
  });

  test("Send-return test", async () => {
    let aliceWif = `${process.env.PRIVATE_WIF!}`;
    let aliceWallet = await RegTestWallet.fromWIF(aliceWif);
    let bobWallet = await RegTestWallet.newRandom();

    genesisOptions.ticker = ticker + "_SR";
    let genesis: SlpGenesisResult = await aliceWallet.slp.genesis(
      genesisOptions
    );

    // send bob some bch gas to enable him to send slp
    await aliceWallet
      .slpAware()
      .send([{ cashaddr: bobWallet.cashaddr!, value: 3000, unit: "sat" }]);

    let aliceSlpBalance = (await aliceWallet.slp.getBalance(genesis.tokenId))
      .value;
    let result = await aliceWallet.slp.send([
      {
        slpaddr: bobWallet.slp.slpaddr,
        value: 5,
        tokenId: genesis.tokenId,
      },
    ]);
    let rawTransaction = (await aliceWallet.provider!.getRawTransactionObject(
      result.txId
    )) as ElectrumRawTransaction;
    expect(rawTransaction.vout.length).toBe(4);

    // slp op_return
    expect(rawTransaction.vout[0].value).toBe(0);

    // slp target
    expect(rawTransaction.vout[1].value).toBe(DUST_UTXO_THRESHOLD / 1e8);
    expect(rawTransaction.vout[1].scriptPubKey.addresses[0]).toBe(
      bobWallet.cashaddr
    );

    // slp change
    expect(rawTransaction.vout[2].value).toBe(DUST_UTXO_THRESHOLD / 1e8);
    expect(rawTransaction.vout[2].scriptPubKey.addresses[0]).toBe(
      aliceWallet.cashaddr
    );

    // bch change
    expect(rawTransaction.vout[3].scriptPubKey.addresses[0]).toBe(
      aliceWallet.cashaddr
    );

    expect(result.balance.value.isEqualTo(aliceSlpBalance.minus(5)));

    let bobSlpBalance = await bobWallet.slp.getBalance(genesis.tokenId);
    expect(bobSlpBalance.value.toNumber()).toBe(5);

    result = await bobWallet.slp.sendMax(
      aliceWallet.slp.slpaddr,
      genesis.tokenId
    );
    expect(result.balance.value.toNumber()).toBe(0);

    rawTransaction = (await aliceWallet.provider!.getRawTransactionObject(
      result.txId
    )) as ElectrumRawTransaction;
    expect(rawTransaction.vout.length).toBe(3);

    // slp op_return
    expect(rawTransaction.vout[0].value).toBe(0);

    // slp target
    expect(rawTransaction.vout[1].value).toBe(DUST_UTXO_THRESHOLD / 1e8);
    expect(rawTransaction.vout[1].scriptPubKey.addresses[0]).toBe(
      aliceWallet.cashaddr
    );

    // no slp change!

    // bch change
    expect(rawTransaction.vout[2].scriptPubKey.addresses[0]).toBe(
      bobWallet.cashaddr
    );

    let aliceSlpNewBalance = (await aliceWallet.slp.getBalance(genesis.tokenId))
      .value;
    expect(aliceSlpNewBalance.toString()).toBe(aliceSlpBalance.toString());

    // await bobWallet.sendMax(aliceWallet.cashaddr!);

    // check non-slp send did not burn tokens
    aliceSlpNewBalance = (await aliceWallet.slp.getBalance(genesis.tokenId))
      .value;
    expect(aliceSlpNewBalance.toString()).toBe(aliceSlpBalance.toString());

    // send bob some bch gas to enable him to send slp
    // aliceBalance = await aliceWallet.slpAware().send([{cashaddr: bobWallet.cashaddr!, value: 3000, unit: "sat"}]);

    aliceSlpBalance = (await aliceWallet.slp.getBalance(genesis.tokenId)).value;
    result = await aliceWallet.slp.send([
      {
        slpaddr: bobWallet.slp.slpaddr,
        value: 5,
        tokenId: genesis.tokenId,
      },
    ]);
    rawTransaction = (await aliceWallet.provider!.getRawTransactionObject(
      result.txId
    )) as ElectrumRawTransaction;
    expect(rawTransaction.vout.length).toBe(3);

    // slp op_return
    expect(rawTransaction.vout[0].value).toBe(0);

    // slp target
    expect(rawTransaction.vout[1].value).toBe(DUST_UTXO_THRESHOLD / 1e8);
    expect(rawTransaction.vout[1].scriptPubKey.addresses[0]).toBe(
      bobWallet.cashaddr
    );

    // no slp change! since we have sent the utxo we received from bob

    // bch change
    expect(rawTransaction.vout[2].scriptPubKey.addresses[0]).toBe(
      aliceWallet.cashaddr
    );

    expect(result.balance.value.isEqualTo(aliceSlpBalance.minus(5)));

    result = await bobWallet.slp.sendMax(
      aliceWallet.slp.slpaddr,
      genesis.tokenId
    );
    expect(result.balance.value.toNumber()).toBe(0);

    rawTransaction = (await aliceWallet.provider!.getRawTransactionObject(
      result.txId
    )) as ElectrumRawTransaction;
    expect(rawTransaction.vout.length).toBe(3);

    // slp op_return
    expect(rawTransaction.vout[0].value).toBe(0);

    // slp target
    expect(rawTransaction.vout[1].value).toBe(DUST_UTXO_THRESHOLD / 1e8);
    expect(rawTransaction.vout[1].scriptPubKey.addresses[0]).toBe(
      aliceWallet.cashaddr
    );

    // no slp change!

    // bch change
    expect(rawTransaction.vout[2].scriptPubKey.addresses[0]).toBe(
      bobWallet.cashaddr
    );

    aliceSlpNewBalance = (await aliceWallet.slp.getBalance(genesis.tokenId))
      .value;
    expect(aliceSlpNewBalance.toString()).toBe(aliceSlpBalance.toString());

    await bobWallet.sendMax(aliceWallet.cashaddr!);

    // check non-slp send did not burn tokens
    aliceSlpNewBalance = (await aliceWallet.slp.getBalance(genesis.tokenId))
      .value;
    expect(aliceSlpNewBalance.toString()).toBe(aliceSlpBalance.toString());
  });

  test("Mint test", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);

    // can not mint less than or 0 tokens
    await expect(aliceWallet.slp.mint(-1, tokenId)).rejects.toThrow();

    let result = await aliceWallet.slp.mint(50, tokenId);
    expect(result.balance.value.isEqualTo(10040));
    expect(result.balance.name).toBe("Mainnet coin");
    expect(result.balance.ticker).toBe(ticker);
    expect(result.balance.tokenId).toBe(tokenId);

    // the baton must survive the first mint, and we end it now
    result = await aliceWallet.slp.mint(50, tokenId, true);
    expect(result.balance.value.isEqualTo(10090));
    expect(result.balance.name).toBe("Mainnet coin");
    expect(result.balance.ticker).toBe(ticker);
    expect(result.balance.tokenId).toBe(tokenId);

    // can not mint after baton is burnt
    await expect(aliceWallet.slp.mint(50, tokenId)).rejects.toThrow();
  });

  test("Test tokenId ambiguity", async () => {
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

    // test empty send requests throw
    await expect(aliceWallet.slp.send([])).rejects.toThrow();

    // test sending zero amount should throw
    await expect(
      aliceWallet.slp.send([
        {
          slpaddr: aliceWallet.slp.slpaddr,
          value: 0,
          tokenId: genesis1.tokenId,
        },
      ])
    ).rejects.toThrow();

    // test sending two tokens with different tokenIds in a single transaction should throw
    await expect(
      aliceWallet.slp.send([
        {
          slpaddr: aliceWallet.slp.slpaddr,
          value: 10,
          tokenId: genesis1.tokenId,
        },
        {
          slpaddr: aliceWallet.slp.slpaddr,
          value: 10,
          tokenId: genesis2.tokenId,
        },
      ])
    ).rejects.toThrow();

    const result = await aliceWallet.slp.mint(50, genesis1.tokenId);
    expect(result.balance.value.isEqualTo(10050));
    expect(result.balance.name).toBe("Mainnet coin");
    expect(result.balance.ticker).toBe(genesisOptions.ticker);
    expect(result.balance.tokenId).toBe(genesis1.tokenId);
  });

  test("Test watching slp balance", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();

    await mine({ cashaddr: aliceWallet.cashaddr!, blocks: 1 });

    genesisOptions.ticker = ticker + "WB";
    const genesis = await aliceWallet.slp.genesis(genesisOptions);
    const cancelFn = bobWallet.slp.watchBalance((balance) => {
      expect(balance.value.toNumber()).toBeGreaterThan(0);
    });
    await aliceWallet.slp.send([
      {
        slpaddr: bobWallet.slp.slpaddr,
        value: 10,
        tokenId: genesis.tokenId,
      },
    ]);

    delay(5000);
    cancelFn();
  });

  test("Test waiting for slp certain balance", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();

    await mine({ cashaddr: aliceWallet.cashaddr!, blocks: 1 });

    genesisOptions.ticker = ticker + "_WFB";
    const genesis = await aliceWallet.slp.genesis(genesisOptions);
    setTimeout(async () => {
      await aliceWallet.slp.send([
        {
          slpaddr: bobWallet.slp.slpaddr,
          value: 20,
          tokenId: genesis.tokenId,
        },
      ]);
    }, 5000);
    const balance = await bobWallet.slp.waitForBalance(10, genesis.tokenId);
    expect(balance.value.isEqualTo(20));
  });

  test("Test waiting for slp transaction", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();

    genesisOptions.ticker = ticker + "_WT";
    const genesis: SlpGenesisResult = await aliceWallet.slp.genesis(
      genesisOptions
    );

    await mine({ cashaddr: aliceWallet.cashaddr!, blocks: 1 });

    setTimeout(async () => {
      await aliceWallet.slp.send([
        {
          slpaddr: bobWallet.slp.slpaddr,
          value: 20,
          tokenId: genesis.tokenId,
        },
      ]);
    }, 5000);
    const transaction = await bobWallet.slp.waitForTransaction(genesis.tokenId);
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
    bobWallet.slp.slpaddr = "";
    await expect(bobWallet.slp.genesis(genesisOptions)).rejects.toThrow();
  });

  test("Test genesis ends baton", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);

    await mine({ cashaddr: aliceWallet.cashaddr!, blocks: 1 });

    genesisOptions.ticker = ticker + "baton_end";
    genesisOptions.documentUrl = undefined;
    genesisOptions.documentHash = undefined;
    genesisOptions.endBaton = true;
    const result: SlpGenesisResult = await aliceWallet.slp.genesis(
      genesisOptions
    );

    tokenId = result.tokenId;

    await expect(aliceWallet.slp.mint(100, tokenId, false)).rejects.toThrow();
  });

  test("Test should get formatted slp utxos", async () => {
    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);

    const utxos: any = await aliceWallet.slp.getFormattedSlpUtxos(
      aliceWallet.cashaddr!
    );
    expect(utxos.length).toBeGreaterThan(0);
    expect(utxos[0].utxoId).toContain(":");
  });
});
