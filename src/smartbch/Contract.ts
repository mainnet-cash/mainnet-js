import { binToHex } from "@bitauth/libauth";
import {
  Argument,
  Artifact,
  Contract as CashScriptContract,
  SignatureTemplate,
  NetworkProvider,
} from "cashscript";
import { compileString, compileFile } from "cashc";
import { getNetworkProvider } from "../network/default";
import { Network, UtxoI } from "../interface";
import { atob, btoa } from "../util/base64";
import { getRandomInt } from "../util/randomInt";
import { DELIMITER } from "../constant";
import { ContractFunction } from "cashscript/dist/module/Contract";
import { UtxoItem } from "../wallet/model";
import { CashscriptTransactionI, ContractI, ContractInfoResponseI, ContractResponseI } from "../contract/interface";
import { ethers } from "ethers";
import { NetworkType } from "../enum";
import { castConstructorParametersFromArtifact, castStringArgumentsFromArtifact, transformContractToRequests } from "../contract/util";
import { defineReadOnly } from "ethers/lib/utils";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";

/**
 * Class that manages the Contract source, network, parameters, CashScript artifact and calls
 */
export class Contract implements ContractI {
  private address: string;
  private script: string | any;
  public parameters: Argument[];
  private artifact?: Artifact;
  public contract: ethers.Contract;
  private provider: ethers.providers.BaseProvider;
  public network: Network;
  private nonce: number;

  /**
   * Initializes a Contract
   *
   * @param script The contract in CashScript syntax
   * @param parameters Stored values of a contract passed to the CashScript constructor
   * @param network Network for the contract
   * @param nonce A unique number to differentiate the contract
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/contract/createContract|/contract/create} REST endpoint
   * @returns A new contract
   */
  constructor(
    address: string,
    script: string | any,
    parameters: any,
    network: Network,
    nonce?: number
  ) {
    this.address = address;
    this.script = script;
    this.parameters = parameters;
    this.network = network ? network : "mainnet";
    // this.artifact = compileString(script);
    this.provider = this.getNetworkProvider(this.network as NetworkType);
    this.contract = this.getContractInstance();
    this.nonce = nonce ? nonce : getRandomInt(2147483647);
  }

  readonly [ key: string ]: ContractFunction | any;

  protected getNetworkProvider(network: NetworkType = NetworkType.Mainnet): ethers.providers.BaseProvider {
    switch (network) {
      case NetworkType.Mainnet: {
        return new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");
      }
      case NetworkType.Testnet: {
        return new ethers.providers.JsonRpcProvider("http://35.220.203.194:8545", { name: "smartbch", chainId: 10001 });
      }
      default: {
        return new ethers.providers.JsonRpcProvider("http://localhost:8545");
      }
    }
  }

  public getContractText(): string | Error {
    return this.script;
  }

  public getNonce() {
    return this.nonce;
  }

  /**
   * getSerializedScript - Serialize just the script component of a contract
   *
   * a low-level function
   *
   * @returns A serialized script
   */
  public getSerializedScript() {
    return btoa(this.script);
  }

  /**
   * getSerializedParameters - Serialize just the parameters of a contract
   *
   * a low-level function
   *
   * @returns The serialized parameters
   */
  public getSerializedParameters() {
    return btoa(this.parameters.map((a) => btoa(a.toString())).join(DELIMITER));
  }

  /**
   * getParameterList - Get the parameters as a list
   *
   * a low-level function
   *
   * @returns A list of parameters as strings
   */
  private getParameterList(): any[] {
    return this.parameters.map((x) =>
      ArrayBuffer.isView(x) ? binToHex(x) : x
    );
  }

  /**
   * toString - Serialize a contract as a string
   *
   * an intermediate function
   *
   * @returns A serialized contract
   */
  public toString() {
    return [
      "contract",
      this.network,
      this.getSerializedParameters(),
      this.getSerializedScript(),
      this.getNonce(),
    ].join(DELIMITER);
  }

  /**
   * fromId - Deserialize a contract from a string
   *
   * an intermediate function
   *
   * @returns A new contract
   */
  public static fromId(contractId: string) {
    let [address, type, network, serializedParams, serializedScript, nonce] =
      contractId.split(DELIMITER);
    let script = atob(serializedScript);
    let artifact = compileString(script);
    let paramStrings = atob(serializedParams)
      .split(DELIMITER)
      .map((s) => atob(s));
    let params = castConstructorParametersFromArtifact(paramStrings, artifact);

    return new Contract(address, script, params, network as Network, parseInt(nonce));
  }

  /**
   * _create - Static convenience method for the constructor
   *
   * an intermediate function similar to the constructor for rest
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/contract/createContract|/contract/create} REST endpoint
   * @returns A new contract
   */
  static _create(
    script: string,
    parameters: string[],
    network: Network,
    nonce?
  ) {
    let artifact = compileString(script);
    let params = castConstructorParametersFromArtifact(parameters, artifact);
    return new this(script, params, network, nonce);
  }

  /**
   * Get the unspent transaction outputs of the contract
   *
   * an intermediate function
   *
   * @note For REST, the address is automatically returned from the create interface
   * @returns The address for a contract
   */
  public getDepositAddress() {
    return this.contract.address;
  }

  /**
   * Get the unspent transaction outputs of the contract
   *
   * a high-level function
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/contract/utxos} REST endpoint
   * @returns A list of utxos on the contract
   */
  public async getUtxos() {
    return {
      utxos: (await this.contract.getUtxos()).map((u) => {
        return UtxoItem.fromElectrum(u);
      }),
    };
  }

  /**
   * Get the current balance of the contract
   *
   * @returns The balance in satoshi
   */
  public getBalance() {
    return this.contract.getBalance();
  }

  /**
   * Get the information about the contract
   *
   * a high-level function
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/contract/info} REST endpoint
   * @returns The contract info
   */
  public info(): ContractInfoResponseI {
    return {
      contractId: this.toString(),
      cashaddr: this.contract.address,
      script: this.script,
      parameters: this.getParameterList(),
      nonce: this.nonce,
    };
  }

  public _info(): ContractInfoResponseI {
    return this.info();
  }

  /**
   * getContractInstance - get the object directly as a cashscript contract.
   * @returns A CashScript Contract
   */
  private getContractInstance() {
    // return new ethers.Contract(this.address, this.script, this.provider);
    const contract = new ethers.Contract(this.address, this.script, this.provider);
    Object.keys(contract.interface.functions).forEach((signature) => {
      const fragment = contract.interface.functions[signature];

      defineReadOnly(this, fragment.name, contract[signature]);
    });

    return contract;
  }

  /**
   * fromScript - initialize the artifact and cashscript object from existing script
   * @returns A cashscript Contract
   */
  public fromScript() {
    // this.artifact = compileFile(this.script);
    this.contract = new ethers.Contract(this.address, this.script, this.provider);
    return this;
  }

  /**
   * Get a contract object from a script, arguments, network and nonce
   * @param script The contract cashscript test
   * @param parameters Contract constructor arguments
   * @param network Network for the contract
   * @param nonce A unique number to differentiate the contract
   * @returns A new Contract
   */
  public static fromScript(
    address: string,
    script: string,
    parameters: Argument[],
    network: Network,
    nonce: number
  ) {
    return new this(address, script, parameters, network, nonce).fromScript();
  }

  /**
   * getContractFunction - Get a function object from a contract
   *
   * @param funcName The string identifying the function in the cashscript contract
   * @returns A cashscript Transaction
   */
  public getContractFunction(funcName: string) {
    return this.contract.functions[funcName];
  }

  /**
   * runFunctionFromStrings -  Call a cashscript contract function using an interface object of strings.
   *
   * This is a helper function for the REST or serialized interfaces and not intended
   * for native use within the library, although it may be useful for running stored transactions.
   *
   * @param request Parameters for the transaction call, serialized as strings.
   * @returns A CashScript Transaction result
   */
  public async runFunctionFromStrings(request: {
    function: string;
    arguments: Array<any>;
    overrides?: ethers.CallOverrides
  }) {
    if (request.overrides === undefined) {
      request.overrides = {};
    }

    if (request.overrides.nonce === undefined) {
      request.overrides.nonce = this.nonce;
    }

    return this.contract[request.function](...arguments, request.overrides);
  }

  public getFunctionByName(funcName) {
    if (typeof this.contract.functions[funcName] === "function") {
      return this.contract.functions[funcName];
    } else {
      throw Error(`${funcName} is not a contract method`);
    }
  }
  public async estimateFee(
    func: ContractFunction,
    ...args
  ) {
    const fn = this.getContractFunction(func.name);
    this.contract.estimateGas[fn.name](args);
  }

  /**
   * Create a new contract, but respond with a json object
   * @param request A contract request object
   * @returns A new contract object
   */
  public static contractRespFromJsonRequest(request: any): ContractResponseI {
    let contract = Contract._create(
      request.script,
      request.parameters,
      request.network
    );
    if (contract) {
      return {
        contractId: contract.toString(),
        cashaddr: contract.getDepositAddress(),
      };
    } else {
      throw Error("Error creating contract");
    }
  }

  public async isDeployed() {
    return this.contract.deployed();
  }

  public deploy() {

  }
}
