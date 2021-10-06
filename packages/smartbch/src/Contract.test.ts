import { ethers } from "ethers";
import { SmartBchWallet } from ".";
import { Contract } from "./Contract";
import { Sep20 } from "./Sep20";
import { RegTestSmartBchWallet } from "./SmartBchWallet";
import { delay } from "mainnet-js";

describe(`Test Ethereum functions`, () => {
  test.skip("Test eth mainnet contract", async () => {
    const abi = Sep20.abi;

    const contract = new Contract(
      "0xdac17f958d2ee523a2206206994597c13d831ec7", // tether usd
      abi,
      "EthMainnet" as any
    );

    // const balance: ethers.BigNumber = await contract.balanceOf(
    //   "0x227F0226499E308769478669669CbdCf4E7dA002" // tether usd deployer address
    // );
    // expect(balance.toNumber()).toBeGreaterThanOrEqual(0);

    // const contractId = contract.toString();

    // const cont = Contract.fromId(contractId);
    // delete (cont as any).provider;
    // delete (cont as any).contract;
    // delete (contract as any).provider;
    // delete (contract as any).contract;
    // expect(JSON.stringify(cont)).toEqual(JSON.stringify(contract));
    // console.log(contract.contract.filters.Transfer(null, null))
    // console.log(await contract.provider.getLogs(contract.contract.filters.Transfer(null, null)))
    console.log(
      await contract.provider.getLogs({
        // address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        fromBlock: 0xa3b631,
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          null,
          "0x000000000000000000000000b55438d2261c9dfa801848c89377d77fa35a1917",
        ],
      })
    );
  });

  test("Test deploying contract, getting gas estimates and invoking methods", async () => {
    const script = Sep20.script;

    const wallet = await RegTestSmartBchWallet.fromId(
      process.env.SBCH_ALICE_ID!
    );

    const contract = await Contract.deploy(
      wallet,
      script,
      "Mainnet Coin",
      "MNC",
      8,
      1000000000,
      wallet.getDepositAddress(),
      wallet.getDepositAddress(),
      undefined === true,
      {
        gasPrice: 10 ** 10,
      }
    );

    const totalSupply: ethers.BigNumber = await contract.totalSupply();
    expect(totalSupply.toNumber()).toBeGreaterThanOrEqual(0);

    const constGas = await contract.estimateGas("decimals");
    expect(constGas).toStrictEqual(ethers.BigNumber.from(0));

    let constReply = await contract.runFunctionFromStrings({
      function: "decimals",
    });
    expect(constReply.result).toBe(8);
    let constReply2 = await contract.decimals();
    expect(constReply2).toBeDefined();
    expect(constReply.result).toStrictEqual(constReply2);

    const to = contract.getDepositAddress();
    const value = 10000;
    const overrides = { gasPrice: 10 ** 10 };

    const txGas = await contract.estimateGas("transfer", to, value, overrides);
    expect(txGas.toNumber()).toBeGreaterThan(0);

    const txReply = await contract.runFunctionFromStrings({
      function: "transfer",
      arguments: [to, value],
      overrides: overrides,
    });

    expect(txReply.txId!.length).toBe(66);
    expect(txReply.receipt!.transactionHash.length).toBe(66);
  });
});
