// import { BigNumber, BigNumberish } from "ethers";
import BigNumber from "bignumber.js";
import { Erc20GenesisOptions } from "./interface";
import { RegTestSmartBchWallet, SmartBchWallet } from "./SmartBchWallet";

describe(`Test Ethereum functions`, () => {
  test("Test querying eth mainnet", async () => {
    const wallet = await SmartBchWallet.watchOnly(
      "0x227F0226499E308769478669669CbdCf4E7dA002"
    );
    expect(
      (
        await wallet.erc20.getBalance(
          "0xdac17f958d2ee523a2206206994597c13d831ec7"
        )
      ).value.toNumber()
    ).toBeGreaterThanOrEqual(0);

    expect(
      (
        await wallet.erc20.getTokenInfo(
          "0xdac17f958d2ee523a2206206994597c13d831ec7"
        )
      ).totalSupply.toNumber()
    ).toBeGreaterThanOrEqual(0);
  });

  test("Should fail to make a paid transaction from watch-only wallet", async () => {
    const wallet = await SmartBchWallet.watchOnly(
      "0x227F0226499E308769478669669CbdCf4E7dA002"
    );

    await expect(
      wallet.erc20.send(
        [
          {
            address: wallet.getDepositAddress(),
            tokenId: "0xdac17f958d2ee523a2206206994597c13d831ec7",
            value: 3,
          },
        ],
        { gasPrice: 10 ** 10 }
      )
    ).rejects.toThrow("sending a transaction requires a signer");
  });

  test("ERC20 genesis and info", async () => {
    const watchWallet = await SmartBchWallet.watchOnly(
      "0x227F0226499E308769478669669CbdCf4E7dA002"
    );

    const options = <Erc20GenesisOptions>{
      name: "Mainnet Coin",
      ticker: "MNC",
      decimals: 8,
      initialAmount: 10,
    };

    await expect(watchWallet.erc20.genesis(options)).rejects.toThrow(
      "Cannot deploy contracts with Watch-Only wallets"
    );

    const alice = await RegTestSmartBchWallet.fromPrivateKey(
      "0x758c7be51a76a9b6bc6b3e1a90e5ff4cc27aa054b77b7acb6f4f08a219c1ce45"
    );

    const result = await alice.erc20.genesis(options, {
      gasPrice: 10 ** 10,
    });

    expect(result.balance.value).toStrictEqual(new BigNumber(10));
    expect(result.balance.name).toBe(options.name);
    expect(result.balance.ticker).toBe(options.ticker);
    expect(result.balance.decimals).toBe(options.decimals);
    expect(result.tokenId).toBe(result.balance.tokenId);

    // get token info
    const tokenInfo = await alice.erc20.getTokenInfo(result.tokenId);
    expect(tokenInfo.name).toBe(options.name);
    expect(tokenInfo.ticker).toBe(options.ticker);
    expect(tokenInfo.decimals).toBe(options.decimals);
    expect(tokenInfo.tokenId).toBe(result.tokenId);
    expect(tokenInfo.totalSupply).toStrictEqual(new BigNumber(10));

    // send
    const bob = await RegTestSmartBchWallet.fromPrivateKey(
      "0x17e40d4ce582a9f601e2a54d27c7268d6b7b4b865e1204bda15778795b017bff"
    );
    const sendResult = await alice.erc20.send(
      [
        {
          address: bob.getDepositAddress(),
          tokenId: result.tokenId,
          value: 3,
        },
      ],
      { gasPrice: 10 ** 10 }
    );

    expect(sendResult[0].balance.value).toStrictEqual(new BigNumber(7));
    expect(
      (await bob.erc20.getBalance(result.tokenId)).value
    ).toStrictEqual(new BigNumber(3));

    const charlie = await RegTestSmartBchWallet.newRandom();
    const dave = await RegTestSmartBchWallet.newRandom();
    const sendManyResult = await alice.erc20.send(
      [
        {
          address: charlie.getDepositAddress(),
          tokenId: result.tokenId,
          value: 1,
        },
        {
          address: dave.getDepositAddress(),
          tokenId: result.tokenId,
          value: 2,
        },
      ],
      { gasPrice: 10 ** 10 }
    );

    expect(
      (await alice.erc20.getBalance(result.tokenId)).value
    ).toStrictEqual(new BigNumber(4));
    expect(
      (await charlie.erc20.getBalance(result.tokenId)).value
    ).toStrictEqual(new BigNumber(1));
    expect(
      (await dave.erc20.getBalance(result.tokenId)).value
    ).toStrictEqual(new BigNumber(2));

    // sendMax
    const sendMaxResult = await bob.erc20.sendMax(
      alice.getDepositAddress(),
      result.tokenId,
      { gasPrice: 10 ** 10 }
    );
    expect(sendMaxResult.balance.value).toStrictEqual(new BigNumber(0));
    expect((await alice.erc20.getBalance(result.tokenId)).value).toStrictEqual(
      new BigNumber(7)
    );
    expect(
      (await bob.erc20.getBalance(result.tokenId)).value
    ).toStrictEqual(new BigNumber(0));
  });

  test("ERC20 genesis with token receiver and baton receiver", async () => {
    const wallet = await RegTestSmartBchWallet.fromPrivateKey(
      "0x758c7be51a76a9b6bc6b3e1a90e5ff4cc27aa054b77b7acb6f4f08a219c1ce45"
    );

    const receiverWallet = await RegTestSmartBchWallet.fromPrivateKey(
      "0x17e40d4ce582a9f601e2a54d27c7268d6b7b4b865e1204bda15778795b017bff"
    );

    const options = <Erc20GenesisOptions>{
      name: "Mainnet Coin",
      ticker: "MNC",
      decimals: 8,
      initialAmount: 10,
      tokenReceiverAddress: receiverWallet.getDepositAddress(),
      batonReceiverAddress: receiverWallet.getDepositAddress(),
    };

    const result = await wallet.erc20.genesis(options, {
      gasPrice: 10 ** 10,
    });

    expect(result.balance.value).toStrictEqual(new BigNumber(0));
    expect(result.balance.name).toBe(options.name);
    expect(result.balance.ticker).toBe(options.ticker);
    expect(result.balance.decimals).toBe(options.decimals);
    expect(result.tokenId).toBe(result.balance.tokenId);
    expect((await wallet.erc20.getBalance(result.tokenId)).value).toStrictEqual(
      new BigNumber(0)
    );
    expect(
      (await receiverWallet.erc20.getBalance(result.tokenId)).value
    ).toStrictEqual(new BigNumber(10));

    // mint
    const mintResult = await receiverWallet.erc20.mint(
      {
        tokenId: result.tokenId,
        value: 5,
        tokenReceiverAddress: receiverWallet.getDepositAddress(),
      },
      { gasPrice: 10 ** 10, gasLimit: -1 }
    );
    expect(mintResult.balance.value).toStrictEqual(new BigNumber(15));

    // mint fail, no role
    await expect(
      wallet.erc20.mint(
        {
          tokenId: result.tokenId,
          value: 5,
          tokenReceiverAddress: wallet.getDepositAddress(),
        },
        { gasPrice: 10 ** 10, gasLimit: -1 }
      )
    ).rejects.toThrow(
      "is not allowed to mint or minting is not supported by the contract"
    );
  });

  test("ERC20 mint disabled (baton ended)", async () => {
    const wallet = await RegTestSmartBchWallet.fromPrivateKey(
      "0x758c7be51a76a9b6bc6b3e1a90e5ff4cc27aa054b77b7acb6f4f08a219c1ce45"
    );

    const options = <Erc20GenesisOptions>{
      name: "Mainnet Coin",
      ticker: "MNC",
      decimals: 8,
      initialAmount: 10,
      endBaton: true,
    };

    const result = await wallet.erc20.genesis(options, {
      gasPrice: 10 ** 10,
    });

    expect(result.balance.value).toStrictEqual(new BigNumber(10));
    expect(result.balance.name).toBe(options.name);
    expect(result.balance.ticker).toBe(options.ticker);
    expect(result.balance.decimals).toBe(options.decimals);
    expect(result.tokenId).toBe(result.balance.tokenId);

    // mint fail, mint was disabled by genesis options
    await expect(
      wallet.erc20.mint(
        {
          tokenId: result.tokenId,
          value: 5,
          tokenReceiverAddress: wallet.getDepositAddress(),
        },
        { gasPrice: 10 ** 10, gasLimit: -1 }
      )
    ).rejects.toThrow(
      "is not allowed to mint or minting is not supported by the contract"
    );
  });
});
