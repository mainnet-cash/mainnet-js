// import { ethers, utils } from "ethers";
// import { Wallet } from "ethers";
import { RegTestSmartBchWallet, SmartBchWallet, TestNetSmartBchWallet, Wallet } from "../wallet/Wif";

describe(`Test Ethereum functions`, () => {
  test("Query ethernet with class", async () => {
    const wallet = await RegTestSmartBchWallet.newRandom();
    console.log(wallet.privateKey, typeof wallet);
    // console.log(wallet);
    // console.log(JSON.stringify(wallet, null, 2));

    // const b = await Wallet.fromId("adsf")

    // const wallet = await RegTestSmartBchWallet.fromWIF("89b83ea27318a8c46c229f5b85c34975115ebc3b62e5e662e3cb6f96b77c8160");

    // // // const wallet = new ethers.Wallet("0x22115f8d163cbc95cd8d4fc63de7198f42c4057feca5d4e8726ae2f42cca939d").connect(provider);
    // const balance = await wallet.getBalance();
    // console.log(balance);

    // const result = await wallet.send({ cashaddr: "0xA2263c06da00Ea7A7fBD5407ff8B8613F33369E6", value: 0.1, unit: 'bch' });
    // console.log(result);

    // const seedWallet = await SmartBchWallet.fromSeed("indoor dish desk flag debris potato excuse depart ticket judge file exit");
    // console.log(seedWallet.toString());

    // const namedWallet = await SmartBchWallet.named("kek");
    // console.log(namedWallet.toString());

    // const watchWallet = await SmartBchWallet.watchOnly("0x682D38CF37A4fAa1A2Db51C2cca626A7Cc801ECD");
    // console.log(await watchWallet.erc20.getBalance("0xdac17f958d2ee523a2206206994597c13d831ec7"));
  });



  // test("Query ethernet", async () => {
  //   const erc20Abi = [
  //     // Some details about the token
  //     "function name() view returns (string)",
  //     "function symbol() view returns (string)",
  //     "function decimals() view returns (uint8)",

  //     // Get the account balance
  //     "function balanceOf(address) view returns (uint)",

  //     // Send some of your tokens to someone else
  //     "function transfer(address to, uint amount)",

  //     // An event triggered whenever anyone transfers to someone else
  //     "event Transfer(address indexed from, address indexed to, uint amount)"
  //   ];

  //   // const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");
  //   const provider = new ethers.providers.JsonRpcProvider("http://35.220.203.194:8545", { name: "smartbch", chainId: 10001 });
  //   // const balance = await provider.getBalance("0x0000000000000000000000000000000000000000");
  //   // console.log(ethers.utils.formatEther(balance));

  //   const wallet = new ethers.Wallet("0x22115f8d163cbc95cd8d4fc63de7198f42c4057feca5d4e8726ae2f42cca939d").connect(provider);
  //   const balance = await wallet.getBalance();
  //   console.log(ethers.utils.formatEther(balance));

  //   return;

  //   // const wallet = ethers.Wallet.createRandom().connect(provider);
  //   // const wallet2 = ethers.Wallet.fromMnemonic(wallet.mnemonic.phrase).connect(provider);
  //   // expect(JSON.stringify(wallet)).toStrictEqual(JSON.stringify(wallet2));
  //   // const tx = { to: wallet2.address, value: utils.parseEther("1.0") };
  //   // // const txString = await wallet.signTransaction(tx);
  //   // const response = await wallet.sendTransaction(tx);
  //   // console.log(response);

  //   // tether 0xdac17f958d2ee523a2206206994597c13d831ec7
  //   // Aavegotchi 0x3F382DbD960E3a9bbCeaE22651E88158d2791550
  //   const a = async (ercId) => {
  //     const daiContract = new ethers.Contract(ercId, erc20Abi, provider);
  //     return await Promise.all([daiContract.name(), daiContract.symbol(), daiContract.decimals(),
  //       daiContract.balanceOf("0x227F0226499E308769478669669CbdCf4E7dA002")]);
  //     // return daiContract.balanceOf("0x227F0226499E308769478669669CbdCf4E7dA002");
  //   }

  //   const ercIds = ["0xdac17f958d2ee523a2206206994597c13d831ec7",
  //     "0x3F382DbD960E3a9bbCeaE22651E88158d2791550"];

  //   let response = await Promise.all(ercIds.map(id => a(id)));
  //   response.forEach(val => val[3] = ethers.utils.formatUnits(val[3], val[2]));
  //   console.log(response);
  //   console.log('kek');

  //   // const daiContract = new ethers.Contract("0xdac17f958d2ee523a2206206994597c13d831ec7", erc20Abi, provider);
  //   // console.log(await daiContract.name());
  //   // console.log(ethers.utils.formatUnits(await daiContract.balanceOf("0x227F0226499E308769478669669CbdCf4E7dA002"), 18));
  //   // console.log(await daiContract.symbol());
  // });
});