import { BigNumber, BigNumberish } from "ethers";
import { GenesisOptions } from "./Erc20";
import { RegTestSmartBchWallet, SmartBchWallet } from "./SmartBchWallet";

describe(`Test Ethereum functions`, () => {
  test.skip("Test ERC20", async () => {
    const wallet = await SmartBchWallet.watchOnly(
      "0x227F0226499E308769478669669CbdCf4E7dA002"
    );
    // console.log(await wallet.erc20.getDecimals("0xE6C035C693806d14C80754d81537d023C8bcaE65"));
    console.log(
      await wallet.erc20.getBalance(
        "0xdac17f958d2ee523a2206206994597c13d831ec7"
      )
    );
  });

  test("Test ERC20 deploy", async () => {
    const wallet = await SmartBchWallet.watchOnly(
      "0x227F0226499E308769478669669CbdCf4E7dA002"
    );

    const options = <GenesisOptions>{
      name: "Mainnet Coin",
      ticker: "MNC",
      decimals: 8,
      initialAmount: 10,
      endBaton: true,
    };

    await expect(wallet.erc20.genesis(options)).rejects.toThrow(
      "Cannot deploy contracts with Watch-Only wallets"
    );

    const pkWallet = await RegTestSmartBchWallet.fromPrivateKey(
      "0x758c7be51a76a9b6bc6b3e1a90e5ff4cc27aa054b77b7acb6f4f08a219c1ce45"
    );
    const result = await pkWallet.erc20.genesis(options, {
      gasPrice: 10 ** 10,
    });

    expect(result.balance.value.isEqualTo(10));
    expect(result.balance.name).toBe(options.name);
    expect(result.balance.ticker).toBe(options.ticker);
    expect(result.balance.decimals).toBe(options.decimals);
    expect(result.tokenId).toBe(result.balance.tokenId);

    const receiverWallet = await RegTestSmartBchWallet.fromPrivateKey(
      "0x17e40d4ce582a9f601e2a54d27c7268d6b7b4b865e1204bda15778795b017bff"
    );
    const sendResult = await pkWallet.erc20.send(
      [
        {
          slpaddr: receiverWallet.getDepositAddress(),
          tokenId: result.tokenId,
          value: 3,
        },
      ],
      { gasPrice: 10 ** 10 }
    );
    console.log(await pkWallet.erc20.getBalance(result.tokenId));
    console.log(
      await pkWallet.erc20.contract.contract.balanceOf(pkWallet.address!)
    );
    console.log(
      await pkWallet.erc20.contract.contract.balanceOf(receiverWallet.address!)
    );

    console.log(
      await receiverWallet.erc20.contract.getDepositAddress(),
      result.tokenId
    );
    console.log(await receiverWallet.erc20.getBalance(result.tokenId));
    expect(sendResult.balance.value.isEqualTo(7));
  });
});
