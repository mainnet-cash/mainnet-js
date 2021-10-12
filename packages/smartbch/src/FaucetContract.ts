import { ethers } from "ethers";
import { SmartBchWallet, Contract } from ".";
import { NetworkType } from "mainnet-js";

export class FaucetContract extends Contract {

  constructor(address: string, network: NetworkType.Mainnet) {
    super(address, FaucetContract.abi, network);
  };

  static async deployFaucet(signer: SmartBchWallet, value: ethers.BigNumber, overrides: ethers.CallOverrides = {}) {
    overrides.value = value;
    return Contract.deploy(signer, FaucetContract.script, overrides);
  }

  static abi = [
    "function send(address[] calldata _to, uint[] calldata _value) public"
  ];

  static script = `
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract faucet {
  using SafeMath for uint;

  address public owner;

  constructor() payable {
    owner = msg.sender;
  }

  function balance() public view returns (uint256) {
    return address(this).balance;
  }

  function send(address[] calldata _to, uint[] calldata _value) public
  {
    require(msg.sender == this.owner());
    uint sendAmount = _value[0];
    uint remainingValue = address(this).balance;

    require(remainingValue >= sendAmount);

    require(_to.length == _value.length);
    require(_to.length <= 255);

    for (uint8 i = 0; i < _to.length; i++) {
      remainingValue = remainingValue.sub(_value[i]);
      require(payable(_to[i]).send(_value[i]));
    }
  }

  // function sendToken(address[] calldata _tokenAddress, address[] _to, uint[] _value) public {
  //   require(_to.length == _value.length);
  //   require(_to.length == _tokenAddress.length);
  //   require(_to.length <= 255);

  //   uint256 sendAmount = _value[0];
  //   ERC20 token = ERC20(_tokenAddress);

  //   for (uint8 i = 0; i < _to.length; i++) {
  //       token.transferFrom(msg.sender, _to[i], _value[i]);
  //   }
  // }
}
`;
}