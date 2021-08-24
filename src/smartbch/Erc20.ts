import {
  SlpGenesisOptions,
  SlpGenesisResult,
  SlpMintOptions,
  SlpMintResult,
  SlpSendRequest,
  SlpSendResponse,
  SlpTokenBalance,
  SlpTokenType,
} from "../slp/interface";
import { SmartBchWallet } from "../wallet/Wif";
import { ethers, utils } from "ethers";
// import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { Contract } from "./Contract";
import { ImageI } from "../qr/interface";
import { isAddress } from "ethers/lib/utils";
import BigNumber from "bignumber.js";
import { zeroAddress } from "./Utils";

const _cache = {};

export interface GenesisOptions {
  name: string;
  ticker: string;
  initialAmount: BigNumber.Value;
  decimals: number;
  endBaton?: boolean;
  tokenReceiverAddress?: string;
  batonReceiverAddress?: string;
}

export interface TokenInfo {
  name: string;
  ticker: string;
  tokenId: string;
  decimals: number;
  totalSupply: BigNumber;
}

/**
 * Class to manage an Erc20 tokens.
 */
export class Erc20 {
  readonly wallet: SmartBchWallet;
  contracts: Map<string, Contract> = new Map<string, Contract>();

  /**
   * Initializes an Slp Wallet.
   *
   * @param wallet     A non-slp wallet object
   */
  constructor(wallet: SmartBchWallet) {
    this.wallet = wallet;
  }

  static get walletType() {
    return SmartBchWallet;
  }

  public contract(tokenId: string): Contract {
    let contract = this.contracts.get(tokenId);
    if (!contract) {
      contract = new Contract(
        tokenId,
        Erc20.abi,
        [],
        this.wallet.network
      ).setSigner(this.wallet);
      this.contracts.set(tokenId, contract);
    }

    return contract;
  }

  public async getName(tokenId: string): Promise<string> {
    return this.getProp(tokenId, "name", async (tokenId) => {
      return await this.contract(tokenId).name();
    });
  }

  public async getSymbol(tokenId: string): Promise<string> {
    return this.getProp(tokenId, "symbol", async (tokenId) => {
      return await this.contract(tokenId).symbol();
    });
  }

  public async getDecimals(tokenId: string): Promise<number> {
    return this.getProp(tokenId, "decimals", async (tokenId) => {
      return await this.contract(tokenId).decimals();
    });
  }

  public async getTotalSupply(tokenId: string): Promise<BigNumber> {
    return this.getProp(tokenId, "totalSupply", async (tokenId) => {
      const totalSupply = await this.contract(tokenId).totalSupply();
      const decimals = await this.getDecimals(tokenId);
      return new BigNumber(totalSupply.toString()).shiftedBy(-decimals);
    });
  }

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
   * a high-level function,
   *
   * @returns The SmartBch address as a string
   */
  public getDepositAddress(): string {
    return this.wallet.getDepositAddress();
  }

  /**
   * getDepositQr - get the SmartBch address qrcode, encoded for display on the web
   *
   * a high-level function
   *
   * @returns The qrcode for the SmartBch address
   */
  public getDepositQr(): ImageI {
    return this.wallet.getDepositQr();
  }

  /**
   * getTokenInfo - get data associated with a token
   *
   * a high-level function
   *
   * @param tokenId  The tokenId to request information about
   *
   * @returns Promise to the SmartBch token info or undefined.
   */
  public async getTokenInfo(tokenId: string): Promise<TokenInfo> {
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
   * a high-level function, see also /wallet/slp/balance REST endpoint
   *
   * @param tokenId   The id of the slp token
   *
   * @returns Promise to an SlpTokenBalance
   */
  public async getBalance(tokenId: string): Promise<SlpTokenBalance> {
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

    return <SlpTokenBalance>{ name, ticker, decimals, value, tokenId };
  }

  /**
   * genesis - create a new SmartBch ERC20 token
   *
   * @param options    Token creation options @see SlpGenesisOptions
   *
   * @returns Token Id and new token balance
   */
  public async genesis(
    options: GenesisOptions,
    overrides: ethers.CallOverrides = {}
  ): Promise<SlpGenesisResult> {
    const baseInitialAmount = ethers.BigNumber.from(
      new BigNumber(options.initialAmount)
        .shiftedBy(options.decimals)
        .toString()
    );
    const contract = await Contract.deploy(
      this.wallet,
      Erc20.script,
      options.name,
      options.ticker,
      options.decimals,
      baseInitialAmount,
      options.tokenReceiverAddress || zeroAddress(),
      options.batonReceiverAddress || zeroAddress(),
      options.endBaton === true,
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
   * a high-level function, see also /wallet/slp/send_max REST endpoint
   *
   * @param address   destination smartbch address
   * @param tokenId   the id of the token to be spent
   *
   * @returns transaction id and token balance
   */
  public async sendMax(
    address: string,
    tokenId: string,
    overrides: ethers.CallOverrides = {}
  ): Promise<SlpSendResponse> {
    const balance = await this.getBalance(tokenId);
    const requests: SlpSendRequest[] = [balance].map((val) => ({
      slpaddr: address,
      value: val.value,
      ticker: val.ticker,
      tokenId: val.tokenId,
    }));
    return this.send(requests, overrides);
  }

  /**
   * send - attempt to process a list of slp send requests.
   *
   * a high-level function, see also /wallet/slp/send REST endpoint
   *
   * @param [requests]   list of send requests
   *
   * @returns transaction id and token balance
   */
  public async send(
    requests: SlpSendRequest[],
    overrides: ethers.CallOverrides = {}
  ): Promise<SlpSendResponse> {
    let [actualTokenId, result] = await this._processSendRequests(
      requests,
      overrides
    );
    return {
      txId: result,
      balance: await this.getBalance(actualTokenId),
      explorerUrl: result,
    };
  }

  /**
   * _processSendRequests - given a list of sendRequests, estimate fees, build the transaction and submit it.
   *
   * A private utility wrapper to pre-process transactions
   *
   * Unstable - behavior may change without notice.
   *
   * @param  {SlpSendRequest[]} sendRequests
   */
  private async _processSendRequests(
    sendRequests: SlpSendRequest[],
    overrides: ethers.CallOverrides = {}
  ) {
    if (!sendRequests.length) {
      throw Error("Empty send requests");
    }

    const uniqueTokenIds = new Set(sendRequests.map((val) => val.tokenId));
    if (uniqueTokenIds.size > 1) {
      throw Error(
        "You have two different token types with the same ticker. Pass tokenId parameter"
      );
    }

    const tokenId = sendRequests[0].tokenId;
    const to = sendRequests[0].slpaddr;
    const decimals = await this.getDecimals(tokenId);
    const value = ethers.BigNumber.from(
      new BigNumber(sendRequests[0].value).shiftedBy(decimals).toString()
    );

    if (!isAddress(tokenId)) {
      throw new Error(
        "Invalid tokenId, must be valid SmartBch contract address - 40 character long hexadecimal string"
      );
    }

    const response: ethers.providers.TransactionResponse = await this.contract(
      tokenId
    ).transfer(to, value, overrides);
    const receipt = await response.wait();

    return [tokenId, receipt.transactionHash];
  }

  /**
   * mint - create new tokens to increase the circulation supply.
   *
   * a high-level function, see also /wallet/slp/mint endpoint
   *
   * @param value   amount to mint
   * @param tokenId   the tokenId of the slp being minted
   * @param endBaton   boolean indicating whether the token should continue to be "mintable"
   *
   * @returns transaction id and token balance
   */
  public async mint(
    options: SlpMintOptions,
    overrides: ethers.CallOverrides = {}
  ): Promise<SlpMintResult> {
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
   * @param value   amount to mint
   * @param tokenId   the tokenId of the slp being minted
   * @param endBaton   boolean indicating whether the token should continue to be "mintable"
   *
   * @returns the tokenId and minting transaction id
   */
  private async _processMint(
    options: SlpMintOptions,
    overrides: ethers.CallOverrides = {}
  ) {
    options = this.substituteOptionals(options);

    options.value = new BigNumber(options.value);
    if (
      options.value.isLessThanOrEqualTo(0) &&
      options.batonReceiverSlpAddr === this.getDepositAddress()
    ) {
      throw Error("Mint amount should be greater than zero");
    }

    const tokenId = options.tokenId;
    const to = options.tokenReceiverSlpAddr!;
    const decimals = await this.getDecimals(tokenId);
    const value = ethers.BigNumber.from(
      new BigNumber(options.value).shiftedBy(decimals).toString()
    );
    const contract = this.contract(tokenId);

    if (!isAddress(tokenId)) {
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
        overrides.gasLimit = await contract.estimateFee(
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

      return [options.tokenId, receipt.transactionHash];
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
   * will ensure that baton and token receiver are intialized as SLP address of this wallet if absent
   * will ensure that baton will not be ended if endBaton is undefined
   * a private utility wrapper substitute optionals
   *
   * @param options   genesis or mint options to substitute values int
   *
   * @returns options with relevant values substituted/initialized
   */
  private substituteOptionals(options: SlpMintOptions): any {
    if (!options.batonReceiverSlpAddr) {
      options.batonReceiverSlpAddr = this.getDepositAddress();
    }
    if (!options.tokenReceiverSlpAddr) {
      options.tokenReceiverSlpAddr = this.getDepositAddress();
    }
    if (options.endBaton === undefined) {
      options.endBaton = false;
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
}
