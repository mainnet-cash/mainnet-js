import { ethers } from "ethers";
import { RegTestSmartBchWallet } from ".";
import { delay } from "mainnet-js";
import { FaucetContract } from "./FaucetContract";

  test("Test deploying faucet contract", async () => {
    const wallet = await RegTestSmartBchWallet.fromId(
      process.env.SBCH_ALICE_ID!
    );

    const contract = await FaucetContract.deployFaucet(
      wallet,
      ethers.BigNumber.from(10n ** 18n),
      <ethers.CallOverrides>{
        gasPrice: ethers.BigNumber.from(10 ** 10),
      }
    );

    console.log(contract.getDepositAddress());

    const balance: ethers.BigNumber = await contract.balance();
    console.log(balance.toBigInt());
    expect(balance.gt(ethers.BigNumber.from(0))).toBe(true);

    const bobWallet = await RegTestSmartBchWallet.newRandom();
    const response = await (await contract.send([bobWallet.getDepositAddress()], [ethers.BigNumber.from(2000)], { gasPrice: ethers.BigNumber.from(10 ** 10), gasLimit: 1e7})).wait();

    await delay(1000);

    const newBalance: ethers.BigNumber = await contract.balance();
    console.log(newBalance.toBigInt());

    // console.log(await bobWallet.getBalance());
    console.log(await (await bobWallet.provider!.getBalance(bobWallet.address!)).toBigInt());
  });
