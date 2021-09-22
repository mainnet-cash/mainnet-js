import { ImageI } from "mainnet-js";
import {
  PrivKeySmartBchWallet,
  RegTestPrivKeySmartBchWallet,
  RegTestSmartBchWallet,
  RegTestWatchSmartBchWallet,
  SmartBchWallet,
  TestNetPrivKeySmartBchWallet,
  TestNetSmartBchWallet,
  TestNetWatchSmartBchWallet,
  WatchSmartBchWallet,
  Web3SmartBchWallet,
} from "./SmartBchWallet";
import { ethers } from "ethers";
import { Contract } from "./Contract";
import BigNumber from "bignumber.js";
import { zeroAddress } from "./Utils";
import {
  Sep20GenesisOptions,
  Sep20GenesisResult,
  Sep20MintOptions,
  Sep20MintResult,
  Sep20SendRequest,
  Sep20SendResponse,
  Sep20TokenBalance,
  Sep20TokenInfo,
} from "./interface";

const _cache = {};

/**
 * Class to manage Sep20 tokens.
 */
export class Sep20 {
  readonly wallet: SmartBchWallet;
  contracts: Map<string, Contract> = new Map<string, Contract>();

  /**
   * Initializes an Sep20 Wallet.
   *
   * @param wallet     A SmartBch wallet object
   */
  constructor(wallet: SmartBchWallet) {
    this.wallet = wallet;
  }

  static get walletType() {
    return SmartBchWallet;
  }

  /**
   * Accessor to a contract cache.
   *
   * @param tokenId     Sep20 Token Id (contract address)
   */
  public contract(tokenId: string): Contract {
    let contract = this.contracts.get(tokenId);
    if (!contract) {
      contract = new Contract(
        tokenId,
        Sep20.abi,
        this.wallet.network
      ).setSigner(this.wallet);
      this.contracts.set(tokenId, contract);
    }

    return contract;
  }

  /**
   * Get cached token name.
   *
   * @param tokenId     Sep20 Token Id (contract address)
   */
  public async getName(tokenId: string): Promise<string> {
    return this.getProp(tokenId, "name", async (tokenId) => {
      return await this.contract(tokenId).name();
    });
  }

  /**
   * Get cached token symbol (ticker).
   *
   * @param tokenId     Sep20 Token Id (contract address)
   */
  public async getSymbol(tokenId: string): Promise<string> {
    return this.getProp(tokenId, "symbol", async (tokenId) => {
      return await this.contract(tokenId).symbol();
    });
  }

  /**
   * Get cached token decimals.
   *
   * @param tokenId     Sep20 Token Id (contract address)
   */
  public async getDecimals(tokenId: string): Promise<number> {
    return this.getProp(tokenId, "decimals", async (tokenId) => {
      return await this.contract(tokenId).decimals();
    });
  }

  /**
   * Get cached token total supply value.
   *
   * @param tokenId     Sep20 Token Id (contract address)
   */
  public async getTotalSupply(tokenId: string): Promise<BigNumber> {
    return this.getProp(tokenId, "totalSupply", async (tokenId) => {
      const totalSupply = await this.contract(tokenId).totalSupply();
      const decimals = await this.getDecimals(tokenId);
      return new BigNumber(totalSupply.toString()).shiftedBy(-decimals);
    });
  }

  /**
   * Get arbitrary cached value.
   *
   * @param tokenId     Sep20 Token Id (contract address)
   * @param prop        Property name (cache key)
   * @param func        Callback to be executed upon cache miss
   */
  public async getProp(
    tokenId: string,
    prop: string,
    func: (tokenId: string) => Promise<any>
  ): Promise<any> {
    if (_cache[tokenId] && _cache[tokenId][prop]) {
      return _cache[tokenId][prop];
    }

    if (!_cache[tokenId]) {
      _cache[tokenId] = {};
    }

    _cache[tokenId][prop] = await func(tokenId);
    return _cache[tokenId][prop];
  }

  /**
   * getDepositAddress - get the SmartBch deposit address
   *
   * a high-level function, see also /smartbch/erc20/deposit_address REST endpoint
   *
   * @returns The SmartBch address as a string
   */
  public getDepositAddress(): string {
    return this.wallet.getDepositAddress();
  }

  /**
   * getDepositQr - get the SmartBch address qrcode, encoded for display on the web
   *
   * a high-level function, see also /smartbch/erc20/deposit_qr REST endpoint
   *
   * @returns The qrcode for the SmartBch address
   */
  public getDepositQr(): ImageI {
    return this.wallet.getDepositQr();
  }

  /**
   *  explorerUrl   Web url to a transaction on a block explorer
   *
   * @param txId   transaction Id
   * @returns   Url string
   */
  public explorerUrl(txId: string) {
    const explorerUrlMap = {
      mainnet: "https://www.smartscan.cash/transaction/",
      testnet: "",
      regtest: "",
    };

    return explorerUrlMap[this.wallet.network] + txId;
  }

  /**
   * getTokenInfo - get data associated with a token
   *
   * a high-level function, see also /smartbch/erc20/token_info REST endpoint
   *
   * @param tokenId  Sep20 Token Id (contract address)
   *
   * @returns {Sep20TokenInfo} SmartBch token info.
   */
  public async getTokenInfo(tokenId: string): Promise<Sep20TokenInfo> {
    let [name, ticker, decimals, totalSupply] = await Promise.all([
      this.getName(tokenId),
      this.getSymbol(tokenId),
      this.getDecimals(tokenId),
      this.getTotalSupply(tokenId),
    ]);

    return {
      name,
      ticker,
      decimals,
      totalSupply,
      tokenId,
    };
  }

  /**
   * getBalance - get a token balance for a particular address
   *
   * a high-level function, see also /smartbch/erc20/balance REST endpoint
   *
   * @param tokenId   Sep20 Token Id (contract address)
   *
   * @returns {Sep20TokenBalance} token balance
   */
  public async getBalance(tokenId: string): Promise<Sep20TokenBalance> {
    if (!tokenId) {
      throw new Error(`Invalid tokenId ${tokenId}`);
    }

    let [name, ticker, decimals, value] = await Promise.all([
      this.getName(tokenId),
      this.getSymbol(tokenId),
      this.getDecimals(tokenId),
      this.contract(tokenId).balanceOf(this.getDepositAddress()),
    ]);

    value = new BigNumber(value.toString()).shiftedBy(-decimals);

    return { name, ticker, decimals, value, tokenId };
  }

  /**
   * genesis - create a new SmartBch ERC20 token
   *
   * @param {Sep20GenesisOptions} options    Token creation options
   * @param {ethers.CallOverrides} overrides  SmartBch parameters to be enforced (gas price, gas limit etc)
   *
   * a high-level function, see also /smartbch/erc20/genesis REST endpoint
   *
   * @returns {Sep20GenesisResult} Token Id and new token balance
   */
  public async genesis(
    options: Sep20GenesisOptions,
    overrides: ethers.CallOverrides = {}
  ): Promise<Sep20GenesisResult> {
    const opts = this.substituteOptionals({
      ...options,
    }) as Sep20GenesisOptions;

    const initialAmount = ethers.BigNumber.from(
      new BigNumber(opts.initialAmount).shiftedBy(opts.decimals).toString()
    );

    const contract = await Contract.deploy(
      this.wallet,
      Sep20.script,
      opts.name,
      opts.ticker,
      opts.decimals,
      initialAmount,
      opts.tokenReceiverAddress,
      opts.batonReceiverAddress,
      opts.endBaton,
      overrides
    );
    this.contracts.set(contract.getDepositAddress(), contract);

    return {
      tokenId: contract.getDepositAddress(),
      balance: await this.getBalance(contract.getDepositAddress()),
    };
  }

  /**
   * sendMax - send the maximum spendable amount for a token to a smartbch address.
   *
   * a high-level function, see also /smartbch/erc20/send_max REST endpoint
   *
   * @param address   destination smartbch address
   * @param tokenId   Sep20 Token Id (contract address) to be spent
   * @param overrides  SmartBch parameters to be enforced (gas price, gas limit etc)
   *
   * @returns {Sep20SendResponse} transaction id and token balance
   */
  public async sendMax(
    address: string,
    tokenId: string,
    overrides: ethers.CallOverrides = {}
  ): Promise<Sep20SendResponse> {
    const balance = await this.getBalance(tokenId);
    const requests: Sep20SendRequest[] = [balance].map((val) => ({
      address: address,
      value: val.value,
      ticker: val.ticker,
      tokenId: val.tokenId,
    }));
    const responses = await this.send(requests, overrides);
    return responses[0];
  }

  /**
   * send - process a list of Sep20 send requests.
   *
   * a high-level function, see also /smartbch/erc20/send REST endpoint
   *
   * @param [requests]   list of send requests
   * @param overrides  SmartBch parameters to be enforced (gas price, gas limit etc)
   *
   * @returns {Sep20SendResponse[]} array of responses
   */
  public async send(
    requests: Sep20SendRequest[],
    overrides: ethers.CallOverrides = {}
  ): Promise<Sep20SendResponse[]> {
    return this._processSendRequests(requests, overrides);
  }

  /**
   * _processSendRequests - given a list of sendRequests, estimate fees, build the transaction and submit it.
   *
   * A private utility wrapper to pre-process transactions
   *
   * @param  {Sep20SendRequest[]} sendRequests
   * @param overrides  SmartBch parameters to be enforced (gas price, gas limit etc)
   *
   * @returns {Sep20SendResponse[]} array of responses
   */
  private async _processSendRequests(
    sendRequests: Sep20SendRequest[],
    overrides: ethers.CallOverrides = {}
  ): Promise<Sep20SendResponse[]> {
    const responses: Sep20SendResponse[] = [];

    for (const sendRequest of sendRequests) {
      const tokenId = sendRequest.tokenId;
      const to = sendRequest.address;
      const decimals = await this.getDecimals(tokenId);
      const value = ethers.BigNumber.from(
        new BigNumber(sendRequest.value).shiftedBy(decimals).toString()
      );

      if (!ethers.utils.isAddress(tokenId)) {
        throw new Error(
          "Invalid tokenId, must be valid SmartBch contract address - 40 character long hexadecimal string"
        );
      }

      const response: ethers.providers.TransactionResponse =
        await this.contract(tokenId).transfer(to, value, {
          ...overrides,
        });
      const receipt = await response.wait();

      responses.push({
        txId: receipt.transactionHash,
        balance: await this.getBalance(tokenId),
        explorerUrl: this.explorerUrl(receipt.transactionHash),
      });
    }

    return responses;
  }

  /**
   * mint - create new tokens to increase the circulation supply.
   *
   * a high-level function, see also /smartbch/erc20/mint endpoint
   *
   * @param options    Mint options to steer the process
   * @param overrides  SmartBch parameters to be enforced (gas price, gas limit etc)
   *
   * @returns {Sep20MintResult} transaction id and token balance
   */
  public async mint(
    options: Sep20MintOptions,
    overrides: ethers.CallOverrides = {}
  ): Promise<Sep20MintResult> {
    let [actualTokenId, result] = await this._processMint(options, overrides);
    return {
      txId: result,
      balance: await this.getBalance(actualTokenId),
    };
  }

  /**
   * _processMint - given mint parameters, prepare the transaction
   *
   * a private utility wrapper to pre-process transactions
   *
   * @param options    Mint options to steer the process
   * @param overrides  SmartBch parameters to be enforced (gas price, gas limit etc)
   *
   * @returns the tokenId and minting transaction id
   */
  private async _processMint(
    options: Sep20MintOptions,
    overrides: ethers.CallOverrides = {}
  ) {
    const opts = this.substituteOptionals({ ...options }) as Sep20MintOptions;

    opts.value = new BigNumber(opts.value);
    if (opts.value.isLessThanOrEqualTo(0)) {
      throw Error("Mint amount should be greater than zero");
    }

    const tokenId = opts.tokenId;
    const to = opts.tokenReceiverAddress!;
    const decimals = await this.getDecimals(tokenId);
    const value = ethers.BigNumber.from(
      new BigNumber(opts.value).shiftedBy(decimals).toString()
    );
    const contract = this.contract(tokenId);

    if (!ethers.utils.isAddress(tokenId)) {
      throw new Error(
        "Invalid tokenId, must be valid SmartBch contract address - 40 character long hexadecimal string"
      );
    }

    if (!contract.mint) {
      throw new Error(`Token contract ${tokenId} does not support minting`);
    }

    try {
      if (overrides.gasLimit === -1) {
        const copyOverrides = { ...overrides };
        delete copyOverrides.gasLimit;
        overrides.gasLimit = await contract.estimateGas(
          "mint",
          to,
          value,
          copyOverrides
        );
      }

      const response: ethers.providers.TransactionResponse =
        await contract.mint(to, value, overrides);
      const receipt: ethers.providers.TransactionReceipt =
        await response.wait();

      return [opts.tokenId, receipt.transactionHash];
    } catch (error: any) {
      const message: string = ((error.error || {}).error || {}).message || "";
      if (
        message.match(
          /execution reverted: AccessControl: account \w+ is missing role \w+/
        )
      ) {
        throw Error(
          `Address ${this.getDepositAddress()} is not allowed to mint or minting is not supported by the contract ${contract.getDepositAddress()}`
        );
      }

      throw error;
    }
  }

  /**
   * substituteOptionals - substitute optional fields with default values
   *
   * will ensure that baton and token receiver are intialized as Sep20 address of this wallet if absent
   * will ensure that baton will not be ended if endBaton is undefined
   * a private utility wrapper substitute optionals
   *
   * @param options   genesis or mint options to substitute values
   *
   * @returns options with relevant values substituted/initialized
   */
  private substituteOptionals(options: any): any {
    if (options.endBaton === undefined) {
      options.endBaton = false;
    }

    if (!options.batonReceiverAddress) {
      if (options.endBaton === true) {
        options.batonReceiverAddress = zeroAddress();
      } else {
        options.batonReceiverAddress = this.getDepositAddress();
      }
    }

    if (!options.tokenReceiverAddress) {
      options.tokenReceiverAddress = this.getDepositAddress();
    }

    return options;
  }

  static abi = [
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

  static script = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SmartBchSep20 is ERC20, ERC20Burnable, AccessControl {
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
}

//#region Specific Sep20 wallet classes
/**
 * Class to manage an slp enabled testnet wallet.
 */
export class Web3Sep20 extends Sep20 {
  static get walletType() {
    return Web3SmartBchWallet;
  }
}

/**
 * Class to manage an slp enabled testnet wallet.
 */
export class TestNetSep20 extends Sep20 {
  static get walletType() {
    return TestNetSmartBchWallet;
  }
}

/**
 * Class to manage an slp enabled regtest wallet.
 */
export class RegTestSep20 extends Sep20 {
  static get walletType() {
    return RegTestSmartBchWallet;
  }
}

/**
 * Class to manage a bitcoin cash PrivKey wallet.
 */
export class PrivKeySep20 extends Sep20 {
  static get walletType() {
    return PrivKeySmartBchWallet;
  }
}

/**
 * Class to manage a testnet PrivKey wallet.
 */
export class TestNetPrivKeySep20 extends Sep20 {
  static get walletType() {
    return TestNetPrivKeySmartBchWallet;
  }
}

/**
 * Class to manage a regtest PrivKey wallet.
 */
export class RegTestPrivKeySep20 extends Sep20 {
  static get walletType() {
    return RegTestPrivKeySmartBchWallet;
  }
}

/**
 * Class to manage a bitcoin cash watch wallet.
 */
export class WatchSep20 extends Sep20 {
  static get walletType() {
    return WatchSmartBchWallet;
  }
}

/**
 * Class to manage a testnet watch wallet.
 */
export class TestNetWatchSep20 extends Sep20 {
  static get walletType() {
    return TestNetWatchSmartBchWallet;
  }
}

/**
 * Class to manage a regtest watch wallet.
 */
export class RegTestWatchSep20 extends Sep20 {
  static get walletType() {
    return RegTestWatchSmartBchWallet;
  }
}
//#endregion
