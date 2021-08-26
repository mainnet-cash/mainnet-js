import { ethers } from "ethers";
import { Contract } from "../smartbch/Contract";
import { RegTestSmartBchWallet } from "./SmartBchWallet";

describe(`Test Ethereum functions`, () => {
  test("Test eth mainnet contract", async () => {
    const abi = [
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

    const contract = new Contract(
      "0xdac17f958d2ee523a2206206994597c13d831ec7",
      abi,
      [],
      "EthMainnet" as any
    );

    const balance: ethers.BigNumber = await contract.balanceOf(
      "0x227F0226499E308769478669669CbdCf4E7dA002"
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
    const abi = [
      // Some details about the token
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint)",
      "function transfer(address to, uint amount)",
      "function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)",
      "function mint(address to, uint256 amount)",
      "event Transfer(address indexed from, address indexed to, uint amount)",
      "event Approval(address indexed owner, address indexed spender, uint256 value)",
    ];

    const script = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SmartBchErc20 is ERC20, ERC20Burnable, AccessControl {
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  uint8 private _decimals;

  constructor(string memory name_, string memory symbol_, uint8 decimals_, uint256 initialAmount_, address tokenReceiver_, address batonReceiver_, bool endBaton_) ERC20(name_, symbol_) {
    require(decimals_ >= 0, "decimals must be greater than or equal 0");
    require(decimals_ <= 18, "decimals must be less than or equal 18");
    _decimals = decimals_;

    // denominated in base units
    if (initialAmount_ > 0) {
      if (tokenReceiver_ == address(0)) {
        _mint(msg.sender, initialAmount_);
      } else {
        _mint(tokenReceiver_, initialAmount_);
      }
    }

    if (!endBaton_) {
      _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
      if (batonReceiver_ == address(0)) {
        _setupRole(MINTER_ROLE, msg.sender);
      } else {
        _setupRole(MINTER_ROLE, batonReceiver_);
      }
    }
  }

  function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
    _mint(to, amount);
  }

  function decimals() public view virtual override returns (uint8) {
    return _decimals;
  }
}`;

    const wallet = await RegTestSmartBchWallet.fromPrivateKey(
      "0x758c7be51a76a9b6bc6b3e1a90e5ff4cc27aa054b77b7acb6f4f08a219c1ce45"
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
