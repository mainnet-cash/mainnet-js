import { ethers } from "ethers";
import { SmartBchWallet } from "./SmartBchWallet.js";
import { Contract } from "./Contract.js"
import { NetworkType } from "mainnet-js";

export class FaucetContract extends Contract {
  constructor(address: string, network: NetworkType.Mainnet) {
    super(address, FaucetContract.abi, network);
  }

  static async deployFaucet(
    signer: SmartBchWallet,
    value: ethers.BigNumber,
    overrides: ethers.CallOverrides = {}
  ) {
    overrides.value = value;
    return Contract.deploy(signer, FaucetContract.script, overrides);
  }

  static abi = [
    "function destroy() public",
    "function send(address[] calldata _tokenAddress, address[] calldata _to, uint256[] calldata _value) public",
    "event Send(address _tokenAddress, address _to, uint256 _value)",
  ];

  static script = `
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract faucet {
  using SafeMath for uint256;

  address public owner;

  event Send(address _tokenAddress, address _to, uint256 _value);

  constructor() payable {
    owner = msg.sender;
  }

  receive() external payable {}

  function destroy() public {
    require(msg.sender == owner, "Only contract owner can call destroy()");
    selfdestruct(payable(owner));
  }

  function balance() public view returns (uint256) {
    return address(this).balance;
  }

  function send(address[] calldata _tokenAddress, address[] calldata _to, uint256[] calldata _value) public
  {
    require(msg.sender == owner, "Only contract owner can interact with it");

    require(_to.length == _value.length);
    require(_to.length == _tokenAddress.length);
    require(_to.length <= 255);

    for (uint8 i = 0; i < _to.length; i++) {
      if (_tokenAddress[i] == address(0)) {
        require(payable(_to[i]).send(_value[i]));
      } else {
        ERC20 token = ERC20(_tokenAddress[i]);
        token.transfer(_to[i], _value[i]);
      }
      emit Send(_tokenAddress[i], _to[i], _value[i]);
    }
  }
}
`;
}
