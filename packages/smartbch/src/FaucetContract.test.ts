import { ethers } from "ethers";
import { RegTestSmartBchWallet, TestNetSmartBchWallet, Utils } from ".";
import { delay } from "mainnet-js";
import { FaucetContract } from "./FaucetContract";

test.skip("Test deploying faucet contract with tokens", async () => {
  const wallet = await RegTestSmartBchWallet.fromId(process.env.SBCH_ALICE_ID!);

  const contractTargetValue = ethers.BigNumber.from(10n ** 19n);

  const contract = await FaucetContract.deployFaucet(
    wallet,
    contractTargetValue,
    <ethers.CallOverrides>{
      gasPrice: ethers.BigNumber.from(10 ** 10),
    }
  );

  console.log(contract.getDepositAddress());

  const filter = contract.contract.filters.Send();
  let sendEventSeen = false;
  let tokenSendEventSeen = false;
  contract.contract.on(filter, (tokenId, _address, _value) => {
    if (tokenId !== Utils.zeroAddress()) {
      tokenSendEventSeen = true;
    } else {
      sendEventSeen = true;
    }
  });

  const balance: ethers.BigNumber = await contract.balance();
  expect(balance.eq(contractTargetValue)).toBe(true);
  // test sending funds to the contract
  await wallet.send(
    [{ address: contract.getDepositAddress(), value: 1, unit: "bch" }],
    {},
    { gasPrice: ethers.BigNumber.from(10 ** 10), gasLimit: 1e7 }
  );
  expect((await contract.balance()).eq(contractTargetValue.add(10n ** 18n)));

  const bobWallet = await RegTestSmartBchWallet.newRandom();
  const sendResponse = await (
    await contract.send(
      [Utils.zeroAddress()],
      [bobWallet.getDepositAddress()],
      [ethers.BigNumber.from(2000)],
      { gasPrice: ethers.BigNumber.from(10 ** 10), gasLimit: 1e7 }
    )
  ).wait();

  const newBalance: ethers.BigNumber = await contract.balance();
  expect(newBalance.eq(contractTargetValue.add(10n ** 18n).sub(2000))).toBe(
    true
  );
  expect(
    await (await bobWallet.provider!.getBalance(bobWallet.address!)).toBigInt()
  ).toBe(2000n);

  // should throw if not enough funds to send
  await expect(
    (
      await contract.send(
        [Utils.zeroAddress()],
        [bobWallet.getDepositAddress()],
        [ethers.BigNumber.from(10n ** 20n)],
        { gasPrice: ethers.BigNumber.from(10 ** 10), gasLimit: 1e7 }
      )
    ).wait()
  ).rejects.toThrow();

  const options = {
    name: "Mainnet Coin",
    ticker: "MNC",
    decimals: 2,
    initialAmount: 1000000,
    tokenReceiverAddress: wallet.getDepositAddress(),
    batonReceiverAddress: wallet.getDepositAddress(),
  };

  const result = await wallet.sep20.genesis(options, {
    gasPrice: 10 ** 10,
  });
  console.log(result.tokenId);

  // send 10 tokens to the contract
  const tokenSendResult = await wallet.sep20.send(
    [
      {
        address: contract.getDepositAddress(),
        tokenId: result.tokenId,
        value: 10,
      },
    ],
    { gasPrice: 10 ** 10 }
  );

  const contractWallet = await RegTestSmartBchWallet.watchOnly(
    contract.getDepositAddress()
  );

  // wei balance should be unchanged
  const newBalanceAfterTokenSend: ethers.BigNumber = await contract.balance();
  expect(newBalanceAfterTokenSend.eq(newBalance)).toBe(true);

  // contract shall now have 10 tokens
  expect(
    (await contractWallet.sep20.getBalance(result.tokenId)).value.toNumber()
  ).toBe(10);

  // should throw if not enough tokens to send
  await expect(
    (
      await contract.send(
        [result.tokenId],
        [bobWallet.getDepositAddress()],
        [ethers.BigNumber.from(10n ** 20n)],
        { gasPrice: ethers.BigNumber.from(10 ** 10), gasLimit: 1e7 }
      )
    ).wait()
  ).rejects.toThrow();

  // invoke contract send to transfer 1 token to bob
  const response = await (
    await contract.send(
      [result.tokenId],
      [bobWallet.getDepositAddress()],
      [ethers.BigNumber.from(10n ** 2n)],
      { gasPrice: ethers.BigNumber.from(10 ** 10), gasLimit: 1e7 }
    )
  ).wait();

  // contract shall now have 9 tokens, bob 1 token
  expect(
    (await contractWallet.sep20.getBalance(result.tokenId)).value.toNumber()
  ).toBe(9);
  expect(
    (await bobWallet.sep20.getBalance(result.tokenId)).value.toNumber()
  ).toBe(1);

  expect(sendEventSeen).toBe(true);
  expect(tokenSendEventSeen).toBe(true);

  await wallet.sep20.sendMax(contract.getDepositAddress(), result.tokenId, <
    ethers.CallOverrides
  >{
    gasPrice: ethers.BigNumber.from(10 ** 10),
  });

  const beforeDestroy = (await wallet.getBalance("sat")) as number;
  const destroyResponse = await (
    await contract.destroy({
      gasPrice: ethers.BigNumber.from(10 ** 10),
      gasLimit: 1e7,
    })
  ).wait();
  const afterDestroy = (await wallet.getBalance("sat")) as number;
  expect(beforeDestroy).toBeLessThan(afterDestroy);
});

test.skip("Deploy testnet faucet", async () => {
  const wallet = await TestNetSmartBchWallet.fromPrivateKey(
    process.env.FAUCET_SBCH_PRIVKEY!
  );

  const contractTargetValue = ethers.BigNumber.from(10n ** 18n);

  const contract = await FaucetContract.deployFaucet(
    wallet,
    contractTargetValue,
    <ethers.CallOverrides>{
      gasPrice: ethers.BigNumber.from(10 ** 10),
    }
  );

  console.log(contract.getDepositAddress());

  const options = {
    name: "Mainnet Coin",
    ticker: "MNC",
    decimals: 2,
    initialAmount: 1000000,
    tokenReceiverAddress: wallet.getDepositAddress(),
    batonReceiverAddress: wallet.getDepositAddress(),
  };

  const result = await wallet.sep20.genesis(options, {
    gasPrice: 10 ** 10,
  });
  console.log(result.tokenId);
  await wallet.sep20.sendMax(contract.getDepositAddress(), result.tokenId, <
    ethers.CallOverrides
  >{
    gasPrice: ethers.BigNumber.from(10 ** 10),
  });
});
