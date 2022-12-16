import { RegTestWallet, TestNetWallet, Wallet } from "./Wif";

import { Network } from "..";
import { disconnectProviders, initProviders } from "../network";

import { mine } from "../mine/mine";

import { SlpGenesisOptions, SlpGenesisResult } from "../slp/interface";
import { DUST_UTXO_THRESHOLD } from "../constant";
import { ElectrumRawTransaction } from "../network/interface";
import { delay } from "../util/delay";
import BigNumber from "bignumber.js";
import { SlpDbProvider } from "../slp/SlpDbProvider";
import { GsppProvider } from "../slp/GsppProvider";
import { createSlpWallet, walletFromId } from "./createWallet";
import { WalletTypeEnum } from "./enum";

describe.skip("Slp wallet tests", () => {
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
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  };

  const useTestnet = false;

  async function getAliceWallet(): Promise<Wallet> {
    if (useTestnet) {
      let aliceWif = `${process.env.ALICE_TESTNET_WALLET_ID!}`;
      let aliceWallet = await TestNetWallet.fromId(aliceWif);

      return aliceWallet;
    }

    const aliceWif = `${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromWIF(aliceWif);

    return aliceWallet;
  }

  async function getRandomWallet(): Promise<Wallet> {
    if (useTestnet) {
      const bobWallet = await TestNetWallet.newRandom();
      return bobWallet;
    }

    const bobWallet = await RegTestWallet.newRandom();

    return bobWallet;
  }

  test("Genesis test", async () => {
    const aliceWallet = await getAliceWallet();

    const result: SlpGenesisResult = await aliceWallet.slp.genesis(
      genesisOptions
    );

    tokenId = result.tokenId;
    expect(result.balance.value.isEqualTo(10000));
    expect(result.balance.name).toBe("Mainnet coin");
    expect(result.balance.ticker).toBe(ticker);
    expect(result.balance.tokenId).toBe(tokenId);

    const info = await aliceWallet.slp.getTokenInfo(tokenId);
    expect(info!.tokenId).toBe(result.tokenId);
    delete (info as any).tokenId;
    delete (info as any).parentTokenId;
    const tokenInfo = {
      decimals: 2,
      documentHash:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      documentUrl: "https://mainnet.cash",
      initialAmount: new BigNumber(10000),
      name: "Mainnet coin",
      ticker: genesisOptions.ticker,
      type: 1,
    };

    expect(info).toEqual(tokenInfo);
  });

  test("Genesis test, utxos are not suitable", async () => {
    const bobWallet = await getRandomWallet();
    await mine({ cashaddr: bobWallet.cashaddr!, blocks: 5 });
    await expect(bobWallet.slp.genesis(genesisOptions)).rejects.toThrow();
  });

  test("Send test", async () => {
    const aliceWallet = await getAliceWallet();
    const bobWallet = await getRandomWallet();

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
    expect(result.explorerUrl).toContain(result.txId);

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

    const charlieWallet = await getRandomWallet();
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
    let aliceWallet = await getAliceWallet();
    let bobWallet = await getRandomWallet();

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
    const aliceWallet = await getAliceWallet();

    // can not mint less than or 0 tokens
    await expect(
      aliceWallet.slp.mint({ value: -1, tokenId })
    ).rejects.toThrow();

    let result = await aliceWallet.slp.mint({ value: 50, tokenId });
    expect(result.balance.value.isEqualTo(10040));
    expect(result.balance.name).toBe("Mainnet coin");
    expect(result.balance.ticker).toBe(ticker);
    expect(result.balance.tokenId).toBe(tokenId);

    // the baton must survive the first mint, and we end it now
    result = await aliceWallet.slp.mint({ value: 50, tokenId, endBaton: true });
    expect(result.balance.value.isEqualTo(10090));
    expect(result.balance.name).toBe("Mainnet coin");
    expect(result.balance.ticker).toBe(ticker);
    expect(result.balance.tokenId).toBe(tokenId);

    // can not mint after baton is burnt
    await expect(
      aliceWallet.slp.mint({ value: 50, tokenId })
    ).rejects.toThrow();
  });

  test("Test mint baton transfer", async () => {
    const aliceWallet = await getAliceWallet();
    const bobWallet = await getRandomWallet();

    const options = { ...genesisOptions };
    options.ticker = ticker + "TR";
    options.batonReceiverSlpAddr = bobWallet.slp.slpaddr;
    options.tokenReceiverSlpAddr = bobWallet.slp.slpaddr;
    const genesis: SlpGenesisResult = await aliceWallet.slp.genesis(options);

    let aliceBalance = await aliceWallet.slp.getBalance(genesis.tokenId);
    expect(aliceBalance.value.isEqualTo(0));

    let bobBalance = await bobWallet.slp.getBalance(genesis.tokenId);
    expect(bobBalance.value.isEqualTo(10000));

    await aliceWallet.send([
      { cashaddr: bobWallet.cashaddr!, value: 10000, unit: "sat" },
    ]);

    const mintOptions = {
      tokenId: genesis.tokenId,
      value: 0,
      tokenReceiverSlpAddr: aliceWallet.slp.slpaddr,
      batonReceiverSlpAddr: aliceWallet.slp.slpaddr,
    };
    await expect(aliceWallet.slp.mint(mintOptions)).rejects.toThrow();

    await bobWallet.slp.mint(mintOptions);

    aliceBalance = await aliceWallet.slp.getBalance(genesis.tokenId);
    expect(aliceBalance.value.isEqualTo(0));

    bobBalance = await bobWallet.slp.getBalance(genesis.tokenId);
    expect(bobBalance.value.isEqualTo(10000));

    await expect(bobWallet.slp.mint(mintOptions)).rejects.toThrow();
  });

  test("Test tokenId ambiguity", async () => {
    const aliceWallet = await getAliceWallet();

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

    const sendRequests = [...Array(20).keys()].map((_) => ({
      slpaddr: aliceWallet.slp.slpaddr,
      value: 1000,
      tokenId: genesis1.tokenId,
    }));

    // test throw more than 19 send requests are not allowed
    await expect(aliceWallet.slp.send(sendRequests)).rejects.toThrow();

    // test tokenId is invalid
    await expect(
      aliceWallet.slp.send([
        {
          slpaddr: aliceWallet.slp.slpaddr,
          value: 1000,
          tokenId: "my cool token",
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

    const result = await aliceWallet.slp.mint({
      value: 50,
      tokenId: genesis1.tokenId,
    });
    expect(result.balance.value.isEqualTo(10050));
    expect(result.balance.name).toBe("Mainnet coin");
    expect(result.balance.ticker).toBe(genesisOptions.ticker);
    expect(result.balance.tokenId).toBe(genesis1.tokenId);
  });

  test("Test watching slp balance", async () => {
    const aliceWallet = await getAliceWallet();
    const bobWallet = await getRandomWallet();

    genesisOptions.ticker = ticker + "WB";
    const genesis = await aliceWallet.slp.genesis(genesisOptions);

    const cancelFn = bobWallet.slp.watchBalance((balance) => {
      expect(balance.value.toNumber()).toBeGreaterThan(0);
    }, genesis.tokenId);
    await aliceWallet.slp.send([
      {
        slpaddr: bobWallet.slp.slpaddr,
        value: 10,
        tokenId: genesis.tokenId,
      },
    ]);

    delay(2000);
    cancelFn();
  });

  test("Test waiting for slp certain balance", async () => {
    const aliceWallet = await getAliceWallet();
    const bobWallet = await getRandomWallet();

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
    }, 3000);
    const balance = await bobWallet.slp.waitForBalance(10, genesis.tokenId);
    expect(balance.value.isEqualTo(20));
    await mine({ cashaddr: aliceWallet.cashaddr!, blocks: 1 });
  });

  test.skip("Test waiting for slp transaction", async () => {
    const aliceWallet = await getAliceWallet();
    const bobWallet = await getRandomWallet();

    genesisOptions.ticker = ticker + "_WT";
    const genesis: SlpGenesisResult = await aliceWallet.slp.genesis(
      genesisOptions
    );

    setTimeout(async () => {
      await aliceWallet.slp.send([
        {
          slpaddr: bobWallet.slp.slpaddr,
          value: 20,
          tokenId: genesis.tokenId,
        },
      ]);
    }, 3000);
    const transaction = await bobWallet.slp.waitForTransaction(genesis.tokenId);
    expect(transaction.tx_hash.length).toBe(64);
  });

  test("Test getting history", async () => {
    const aliceWallet = await getAliceWallet();

    if (aliceWallet.slp.provider instanceof GsppProvider) {
      return;
    }

    const history = await aliceWallet.slp.getHistory();
    expect(history.length).toBeGreaterThan(0);

    const lastTx = await aliceWallet.slp.getLastTransaction(true);
    expect(lastTx.txid.length).toBe(64);
  });

  test("Test utilities", async () => {
    const aliceWallet = await getAliceWallet();

    expect(aliceWallet.slp.getDepositAddress()).toContain("slp");
    expect(aliceWallet.slp.getDepositQr().src).toContain("data:image");
  });

  test("Test faulty wallet", async () => {
    let options = { ...genesisOptions };

    const bobWallet = await getRandomWallet();
    bobWallet.privateKey = Uint8Array.from([0, 1, 2, 3, 4]);
    // not enough funds
    await expect(bobWallet.slp.genesis(options)).rejects.toThrow();

    // no private key set
    bobWallet.privateKey = undefined;
    await expect(bobWallet.slp.genesis(options)).rejects.toThrow();
    bobWallet.privateKey = Uint8Array.from([0, 1, 2, 3, 4]);

    // no network provider set
    const provider = bobWallet.provider;
    bobWallet.provider = undefined;
    await expect(bobWallet.slp.genesis(options)).rejects.toThrow();
    bobWallet.provider = provider;

    // tokenReceiverSlpAddr is bad
    options.tokenReceiverSlpAddr = "test";
    await expect(bobWallet.slp.genesis(options)).rejects.toThrow();

    options = { ...genesisOptions };

    // batonReceiverSlpAddr is bad
    options.batonReceiverSlpAddr = "test";
    await expect(bobWallet.slp.genesis(options)).rejects.toThrow();

    options = { ...genesisOptions };

    // bob's slpaddr is bad
    bobWallet.slp.slpaddr = "test";
    options.batonReceiverSlpAddr = undefined;
    options.tokenReceiverSlpAddr = undefined;
    await expect(bobWallet.slp.genesis(options)).rejects.toThrow();
  });

  test("Test genesis ends baton", async () => {
    const aliceWallet = await getAliceWallet();

    const options = { ...genesisOptions };
    options.ticker = ticker + "baton_end";
    options.documentUrl = undefined;
    options.documentHash = undefined;
    options.endBaton = true;
    const result: SlpGenesisResult = await aliceWallet.slp.genesis(options);

    tokenId = result.tokenId;

    await expect(
      aliceWallet.slp.mint({ value: 100, tokenId, endBaton: false })
    ).rejects.toThrow();
  });

  test("Test should get formatted slp utxos", async () => {
    const aliceWallet = await getAliceWallet();

    const utxos: any = await aliceWallet.slp.getFormattedSlpUtxos();
    expect(utxos.length).toBeGreaterThan(0);
    expect(utxos[0].utxoId).toContain(":");
  });

  test("Test NFT Parent creation and transfer", async () => {
    const aliceWallet = await getAliceWallet();
    const bobWallet = await getRandomWallet();

    const nftParentGenesis = { ...genesisOptions };
    nftParentGenesis.ticker = ticker + "NFTP";
    nftParentGenesis.name = "Mainnet NFT Parent";
    nftParentGenesis.decimals = 0;
    const parentResult: SlpGenesisResult =
      await aliceWallet.slp.nftParentGenesis(nftParentGenesis);

    const info = await aliceWallet.slp.getTokenInfo(parentResult.tokenId);
    expect(info!.tokenId).toBe(parentResult.tokenId);
    delete (info as any).tokenId;

    const parentTokenInfo = {
      decimals: 0,
      documentHash:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      documentUrl: "https://mainnet.cash",
      initialAmount: new BigNumber(10000),
      name: "Mainnet NFT Parent",
      ticker: nftParentGenesis.ticker,
      type: 0x81,
    };

    delete (info as any).tokenId;
    delete (info as any).parentTokenId;

    expect(info).toEqual(parentTokenInfo);

    let sendResult = await aliceWallet.slp.send([
      {
        slpaddr: bobWallet.slp.slpaddr,
        value: 5,
        tokenId: parentResult.tokenId,
      },
    ]);

    expect(sendResult.balance.value.isEqualTo(9995));
    expect(sendResult.balance.ticker).toBe(nftParentGenesis.ticker);
    expect(sendResult.balance.tokenId).toBe(parentResult.tokenId);

    expect(await bobWallet.slpAware(false).getBalance("satoshi")).toBe(
      DUST_UTXO_THRESHOLD
    );
    expect(await bobWallet.slpAware().getBalance("satoshi")).toBe(0);
    let bobBalance = await bobWallet.slp.getBalance(parentResult.tokenId);
    expect(bobBalance.value.isEqualTo(5));
    expect(bobBalance.ticker).toBe(nftParentGenesis.ticker);
    expect(bobBalance.tokenId).toBe(parentResult.tokenId);
  });

  test("Test NFT Child creation and transfer", async () => {
    const aliceWallet = await getAliceWallet();
    const bobWallet = await getRandomWallet();

    const nftParentGenesis = { ...genesisOptions };
    nftParentGenesis.ticker = ticker + "NFTP";
    nftParentGenesis.name = "Mainnet NFT Parent";
    nftParentGenesis.decimals = 0;
    nftParentGenesis.initialAmount = 2;
    const parentResult: SlpGenesisResult =
      await aliceWallet.slp.nftParentGenesis(nftParentGenesis);

    const nftChildGenesis = { ...genesisOptions };
    nftChildGenesis.ticker = ticker + "NFTC";
    nftChildGenesis.name = "Mainnet NFT Child";
    nftChildGenesis.parentTokenId = parentResult.tokenId;

    const childResult: SlpGenesisResult = await aliceWallet.slp.nftChildGenesis(
      nftChildGenesis
    );

    const childInfo = await aliceWallet.slp.getTokenInfo(childResult.tokenId);
    expect(childInfo!.tokenId).toBe(childResult.tokenId);
    if (aliceWallet.slp.provider instanceof GsppProvider)
      expect((childInfo! as any).parentTokenId).toBe(parentResult.tokenId);

    delete (childInfo as any).tokenId;

    const childTokenInfo = {
      decimals: 0,
      documentHash:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      documentUrl: "https://mainnet.cash",
      initialAmount: new BigNumber(1),
      name: "Mainnet NFT Child",
      ticker: nftChildGenesis.ticker,
      type: 0x41,
    };

    delete (childInfo as any).tokenId;
    delete (childInfo as any).parentTokenId;

    expect(childInfo).toEqual(childTokenInfo);

    let aliceParentBalance = await aliceWallet.slp.getBalance(
      parentResult.tokenId
    );
    expect(aliceParentBalance.value.isEqualTo(1));
    expect(aliceParentBalance.ticker).toBe(nftParentGenesis.ticker);
    expect(aliceParentBalance.tokenId).toBe(parentResult.tokenId);

    let aliceChildBalance = await aliceWallet.slp.getBalance(
      childResult.tokenId
    );
    expect(aliceChildBalance.value.isEqualTo(1));
    expect(aliceChildBalance.ticker).toBe(nftChildGenesis.ticker);
    expect(aliceChildBalance.tokenId).toBe(childResult.tokenId);

    let sendResult = await aliceWallet.slp.send([
      {
        slpaddr: bobWallet.slp.slpaddr,
        value: 1,
        tokenId: childResult.tokenId,
      },
    ]);

    expect(sendResult.balance.value.isEqualTo(0));
    expect(sendResult.balance.tokenId).toBe(childResult.tokenId);

    expect(await bobWallet.slpAware(false).getBalance("satoshi")).toBe(
      DUST_UTXO_THRESHOLD
    );
    expect(await bobWallet.slpAware().getBalance("satoshi")).toBe(0);
    let bobBalance = await bobWallet.slp.getBalance(childResult.tokenId);
    expect(bobBalance.value.isEqualTo(1));
    expect(bobBalance.ticker).toBe(nftChildGenesis.ticker);
    expect(bobBalance.tokenId).toBe(childResult.tokenId);

    // should throw if parent token is not in possession
    nftChildGenesis.parentTokenId =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    await expect(
      aliceWallet.slp.nftChildGenesis(nftChildGenesis)
    ).rejects.toThrow();

    // should throw if parent token is not of type 0x81
    nftChildGenesis.parentTokenId = childResult.tokenId;
    await expect(
      aliceWallet.slp.nftChildGenesis(nftChildGenesis)
    ).rejects.toThrow();

    // bug in the SLPDB, the parent burn check is not triggered until new block arrives
    // if (aliceWallet.slp.provider! instanceof SlpDbProvider) {
    //   await mine({ cashaddr: aliceWallet.cashaddr!, blocks: 1 });
    //   await delay(1000);
    // }

    // spend last token
    const genesis1 = { ...nftChildGenesis };
    genesis1.parentTokenId = parentResult.tokenId;
    genesis1.ticker = ticker + "1";

    const childResultLast: SlpGenesisResult =
      await aliceWallet.slp.nftChildGenesis(genesis1);

    aliceParentBalance = await aliceWallet.slp.getBalance(parentResult.tokenId);
    expect(aliceParentBalance.value.isEqualTo(0));
    aliceChildBalance = await aliceWallet.slp.getBalance(
      childResultLast.tokenId
    );
    expect(aliceParentBalance.value.isEqualTo(1));

    // fail to to perform child genesis. we are out of parent tokens
    const genesis2 = { ...nftChildGenesis };
    genesis2.parentTokenId = parentResult.tokenId;
    genesis2.ticker = ticker + "0";

    await expect(aliceWallet.slp.nftChildGenesis(genesis2)).rejects.toThrow();
  });

  test("Test SLPDB NFT bug", async () => {
    const aliceWallet = await getAliceWallet();

    const nftParentGenesis = { ...genesisOptions };
    nftParentGenesis.ticker = ticker + "NFTP_Bug";
    nftParentGenesis.name = "Mainnet NFT Parent";
    nftParentGenesis.decimals = 0;
    nftParentGenesis.initialAmount = 1;
    const parentResult: SlpGenesisResult =
      await aliceWallet.slp.nftParentGenesis(nftParentGenesis);

    const nftChildGenesis1 = { ...genesisOptions };
    nftChildGenesis1.ticker = ticker + "NFTC_Bug";
    nftChildGenesis1.name = "Mainnet NFT Child";
    nftChildGenesis1.parentTokenId = parentResult.tokenId;

    const childResult: SlpGenesisResult = await aliceWallet.slp.nftChildGenesis(
      nftChildGenesis1
    );

    // // bug in the SLPDB, the parent burn check is not triggered until new block arrives
    // await mine({ cashaddr: aliceWallet.cashaddr!, blocks: 1 });
    // await delay(5000);

    // fail to to perform child genesis. we are out of parent tokens
    const nftChildGenesis2 = { ...genesisOptions };
    nftChildGenesis2.ticker = ticker + "1_Bug";
    nftChildGenesis2.parentTokenId = parentResult.tokenId;

    await expect(
      aliceWallet.slp.nftChildGenesis(nftChildGenesis2)
    ).rejects.toThrow();
  });

  test.skip("test times", async () => {
    // const aliceWallet = await getAliceWallet();

    const slpDbProvider = new SlpDbProvider(Network.REGTEST);
    const gsppProvider = new GsppProvider(Network.REGTEST);

    const start1 = new Date().getTime();
    const count1 = await slpDbProvider.SlpUtxos(
      "simpleledger:qqr7rg6t5pd0xux35297etxklhe4l6p6uua8f5gump"
    );
    const end1 = new Date().getTime();

    const start2 = new Date().getTime();
    const count2 = await gsppProvider.SlpUtxos(
      "simpleledger:qqr7rg6t5pd0xux35297etxklhe4l6p6uua8f5gump"
    );
    const end2 = new Date().getTime();
    // console.log("Slpdb", end1-start1);
    console.log(
      "Slpdb",
      end1 - start1,
      "Gspp",
      end2 - start2,
      count1.length,
      count2.length
    );

    // expect(count1.length).toBe(count2.length);
    // console.log(count1.length, count2.length);
  });

  test("Slp wallet creation", async () => {
    const m = await Wallet.slp.named("wallet");
    expect(m.name).toBe("wallet");
    expect(m.network).toBe(Network.MAINNET);
    expect(m.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(m.derivationPath).toBe("m/44'/245'/0'/0/0");

    const t = await TestNetWallet.slp.named("testnetwallet");
    expect(t.name).toBe("testnetwallet");
    expect(t.network).toBe(Network.TESTNET);
    expect(t.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(t.derivationPath).toBe("m/44'/245'/0'/0/0");

    const r = await RegTestWallet.slp.named("regwallet");
    expect(r.name).toBe("regwallet");
    expect(r.network).toBe(Network.REGTEST);
    expect(r.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(r.derivationPath).toBe("m/44'/245'/0'/0/0");

    let wallet: Wallet;
    wallet = await Wallet.slp.fromSeed(new Array(12).join("abandon "));
    expect(wallet.derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.network).toBe(Network.MAINNET);

    wallet = await TestNetWallet.slp.fromSeed(
      new Array(12).join("abandon "),
      "m/44'/200'/0'/0/0"
    );
    expect(wallet.derivationPath).toBe("m/44'/200'/0'/0/0");
    expect(wallet.getSeed().derivationPath).toBe("m/44'/200'/0'/0/0");
    expect(wallet.network).toBe(Network.TESTNET);

    wallet = await Wallet.slp.newRandom();
    expect(wallet.derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.network).toBe(Network.MAINNET);

    wallet = await Wallet.slp.newRandom("name", "name");
    expect(wallet.derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.network).toBe(Network.MAINNET);

    wallet = await createSlpWallet({
      name: "test",
      network: "mainnet",
      type: WalletTypeEnum.Seed,
    });
    expect(wallet.derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.network).toBe(Network.MAINNET);

    wallet = await createSlpWallet({
      name: "test2",
      network: "testnet",
      type: WalletTypeEnum.Seed,
    });
    expect(wallet.derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.network).toBe(Network.TESTNET);

    wallet = await createSlpWallet({
      name: "test3",
      network: "regtest",
      type: WalletTypeEnum.Seed,
    });
    expect(wallet.derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.network).toBe(Network.REGTEST);

    wallet = await createSlpWallet({
      network: "mainnet",
      type: WalletTypeEnum.Seed,
    });
    expect(wallet.derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.network).toBe(Network.MAINNET);

    wallet = await createSlpWallet({
      network: "testnet",
      type: WalletTypeEnum.Seed,
    });
    expect(wallet.derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.network).toBe(Network.TESTNET);

    wallet = await createSlpWallet({
      network: "regtest",
      type: WalletTypeEnum.Seed,
    });
    expect(wallet.derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.network).toBe(Network.REGTEST);
  });

  test("Slp wallet retrieval", async () => {
    let wallet: Wallet;
    wallet = await createSlpWallet({
      name: "test",
      network: "testnet",
      type: WalletTypeEnum.Seed,
    });
    expect(wallet.derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.getSeed().derivationPath).toBe("m/44'/245'/0'/0/0");
    expect(wallet.network).toBe(Network.TESTNET);
    expect(wallet.name).toBe("test");
  });
});
