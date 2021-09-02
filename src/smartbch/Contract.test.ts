import { ethers } from "ethers";
import { Contract } from "../smartbch/Contract";
import { Erc20 } from "./Erc20";
import { RegTestSmartBchWallet } from "./SmartBchWallet";

describe(`Test Ethereum functions`, () => {
  test("Test eth mainnet contract", async () => {
    const abi = Erc20.abi;

    const contract = new Contract(
      "0xdac17f958d2ee523a2206206994597c13d831ec7", // tether usd
      abi,
      "EthMainnet" as any
    );

    const balance: ethers.BigNumber = await contract.balanceOf(
      "0x227F0226499E308769478669669CbdCf4E7dA002" // tether usd deployer address
    );
    expect(balance.toNumber()).toBeGreaterThanOrEqual(0);

    const contractId = contract.toString();

    const cont = Contract.fromId(contractId);
    delete (cont as any).provider;
    delete (cont as any).contract;
    delete (contract as any).provider;
    delete (contract as any).contract;
    expect(JSON.stringify(cont)).toEqual(JSON.stringify(contract));
  });

  test("Test deploying contract", async () => {
    const script = Erc20.script;

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
  });
});
