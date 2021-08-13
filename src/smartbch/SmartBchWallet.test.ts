// import { ethers, utils } from "ethers";
// import { Wallet } from "ethers";
import { Network } from "cashscript";
import { ethers } from "ethers";
import { hexZeroPad, id } from "ethers/lib/utils";
import { Contract } from "../smartbch/Contract";
import {
  RegTestSmartBchWallet,
  SmartBchWallet,
  TestNetSmartBchWallet,
  Wallet,
} from "../wallet/Wif";

describe(`Test Ethereum functions`, () => {
  test.skip("Filter logs", async () => {
    expect(hexZeroPad("0x8486c538dcbd6a707c5b3f730b6413286fe8c854", 32)).toBe(
      "0x0000000000000000000000008486c538dcbd6a707c5b3f730b6413286fe8c854"
    );
    const filter = {
      // address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      topics: [
        // '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
        null,
        [
          "0x000000000000000000000000dad2bacbc2d2507eedb74a4500b6e1d1ef2d69a7",
          "0x000000000000000000000000691f987fd150967d6b6bd7e7b3d04e9dbc1f4efc",
        ],
        // id("Transfer(address,address,uint256)"),
        // "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        // null,
        // "0x000000000000000000000000190cdef5817afc5d999a81f603562a8990373fbb",
        // null,
        // '0x0000000000000000000000003dfd23a6c5e8bbcfc9581d2e864a68feb6a076d3',
        // '0x000000000000000000000000e3d9988f676457123c5fd01297605efdd0cba1ae'
        // null,
        // "0x0000000000000000000000008486c538dcbd6a707c5b3f730b6413286fe8c854"
        // [
        // hexZeroPad("0x8486c538dcbd6a707c5b3f730b6413286fe8c854", 32),
        // ],
        // [
        //   hexZeroPad("0xB55438d2261C9dFA801848c89377D77fa35a1917", 32),
        // ]
      ],
    };

    const watchWallet = await SmartBchWallet.watchOnly(
      "0xB55438d2261C9dFA801848c89377D77fa35a1917"
    );
    console.log(await watchWallet.provider!.getLogs(filter));

    // console.log(await watchWallet.erc20.contract.contract.interface.encodeFilterTopics(watchWallet.erc20.contract.contract.interface.events["Transfer(address,address,uint256)"], []));
    // console.log(await watchWallet.erc20.contract.contract.filters.Transfer('0xf8ba35cc5493e2dc4e0780d4e299fd627265baaf',
    // '0xa364cf694ce7bf65b67fc595a6f9403281beec59'));
  });
  test.skip("Query ethernet with class", async () => {
    const erc20Abi = [
      // Some details about the token
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",

      // Get the account balance
      "function balanceOf(address) view returns (uint)",

      // Send some of your tokens to someone else
      "function transfer(address to, uint amount)",

      // An event triggered whenever anyone transfers to someone else
      "event Transfer(address indexed from, address indexed to, uint amount)",
    ];

    const wallet = await RegTestSmartBchWallet.fromPrivateKey(
      "758c7be51a76a9b6bc6b3e1a90e5ff4cc27aa054b77b7acb6f4f08a219c1ce45"
    );
    // const contract: Contract = new Contract("0xdac17f958d2ee523a2206206994597c13d831ec7", erc20Abi, [], Network.MAINNET, 0);
    // // console.log(await contract.balanceOf("0x227F0226499E308769478669669CbdCf4E7dA002"));
    // const result = await Promise.all([contract.name(), contract.symbol(), contract.decimals(),
    //   contract.balanceOf("0x227F0226499E308769478669669CbdCf4E7dA002")]);
    // [result].forEach(val => val[3] = ethers.utils.formatUnits(val[3], val[2]));
    // console.log(result);
    const script = `
pragma solidity ^0.8.2;

import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.2.0/contracts/token/ERC721/ERC721.sol";
contract MyCollectible is ERC721 {
  // constructor(string memory name, string memory symbol) ERC721(name, symbol) {
    constructor() ERC721("name", "symbol") {
  }
}`;

    const a = await Contract.deploy(wallet, script, { gasPrice: 10 ** 10 });
    // console.log(a);
    // console.log(await a.symbol());
    console.log(a.toString());

    // console.log(contract.contract.interface.functions);
    // const wallet = await SmartBchWallet.newRandom();
    // const sig = await wallet.sign("kek");
    // const signResult = await wallet.verify("kek", sig.signature);
    // console.log(sig, signResult);
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

  test.skip("Query ethernet", async () => {
    const erc20Abi = [
      // Some details about the token
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",

      // Get the account balance
      "function balanceOf(address) view returns (uint)",

      // Send some of your tokens to someone else
      "function transfer(address to, uint amount)",

      // An event triggered whenever anyone transfers to someone else
      "event Transfer(address indexed from, address indexed to, uint amount)",
    ];

    const provider = new ethers.providers.JsonRpcProvider(
      "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
    );
    // const provider = new ethers.providers.JsonRpcProvider("http://35.220.203.194:8545", { name: "smartbch", chainId: 10001 });
    // const balance = await provider.getBalance("0x0000000000000000000000000000000000000000");
    // console.log(ethers.utils.formatEther(balance));

    // const wallet = new ethers.Wallet("0x22115f8d163cbc95cd8d4fc63de7198f42c4057feca5d4e8726ae2f42cca939d").connect(provider);
    // const balance = await wallet.getBalance();
    // console.log(ethers.utils.formatEther(balance));

    // return;

    // const wallet = ethers.Wallet.createRandom().connect(provider);
    // const wallet2 = ethers.Wallet.fromMnemonic(wallet.mnemonic.phrase).connect(provider);
    // expect(JSON.stringify(wallet)).toStrictEqual(JSON.stringify(wallet2));
    // const tx = { to: wallet2.address, value: utils.parseEther("1.0") };
    // // const txString = await wallet.signTransaction(tx);
    // const response = await wallet.sendTransaction(tx);
    // console.log(response);

    // tether 0xdac17f958d2ee523a2206206994597c13d831ec7
    // Aavegotchi 0x3F382DbD960E3a9bbCeaE22651E88158d2791550
    const a = async (ercId) => {
      const daiContract = new ethers.Contract(ercId, erc20Abi, provider);
      return await Promise.all([
        daiContract.name(),
        daiContract.symbol(),
        daiContract.decimals(),
        daiContract.balanceOf("0x227F0226499E308769478669669CbdCf4E7dA002"),
      ]);
      // return daiContract.balanceOf("0x227F0226499E308769478669669CbdCf4E7dA002");
    };

    const ercIds = [
      "0xdac17f958d2ee523a2206206994597c13d831ec7",
      "0x3F382DbD960E3a9bbCeaE22651E88158d2791550",
    ];

    let response = await Promise.all(ercIds.map((id) => a(id)));
    response.forEach(
      (val) => (val[3] = ethers.utils.formatUnits(val[3], val[2]))
    );
    console.log(response);
    console.log("kek");

    // const daiContract = new ethers.Contract("0xdac17f958d2ee523a2206206994597c13d831ec7", erc20Abi, provider);
    // console.log(await daiContract.name());
    // console.log(ethers.utils.formatUnits(await daiContract.balanceOf("0x227F0226499E308769478669669CbdCf4E7dA002"), 18));
    // console.log(await daiContract.symbol());
  });
});
