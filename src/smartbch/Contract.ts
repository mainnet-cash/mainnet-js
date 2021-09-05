import { binToHex } from "@bitauth/libauth";
import { getNetworkProvider } from "./Network";
import { Network } from "../interface";
import { atob, btoa } from "../util/base64";
import { DELIMITER } from "../constant";
import { ContractFactory, ethers } from "ethers";
import { NetworkType } from "../enum";
import { XMLHttpRequest } from "xmlhttprequest-ssl";
import { SmartBchWallet } from "./SmartBchWallet";
import { WalletTypeEnum } from "../wallet/enum";
import fs from "fs";
import solc from "../../polyfill/solc";
import {
  Argument,
  ContractFnRequestI,
  ContractFnResponseI,
  ContractInfoResponseI,
  ContractRequestI,
  ContractResponseI,
} from "./interface";

/**
 * Class that manages the SmartBch Contract source, network, parameters and calls
 */
export class Contract {
  private address: string;
  public abi: ethers.ContractInterface;
  public script: string = "";
  public parameters: Argument[] = [];
  public contract: ethers.Contract;
  private provider: ethers.providers.Provider;
  public network: Network = NetworkType.Mainnet;
  private signer?: ethers.Signer;
  public deployReceipt?: ethers.providers.TransactionReceipt;

  /**
   * Initializes a Contract with its address and ABI
   * @see deploy static method to deploy new contract to the network, check out
   *
   * @note The created contract instance allows for read-only interactions unless bound to a `signer` - a SmartBchWallet instance @see setSigner
   *
   * @param address Address of an already deployed contract
   * @param abi Contract ABI (Application Binary Interface), which describes the contract interaction
   * @param network Network on which the contract is deployed
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/smartbch/contract/create} REST endpoint
   * @returns A new contract
   */
  constructor(
    address: string,
    abi: ethers.ContractInterface,
    network: Network = Network.MAINNET
  ) {
    this.address = address;
    this.abi = abi;
    this.network = network ? network : "mainnet";
    this.provider = getNetworkProvider(this.network as NetworkType);

    this.contract = new ethers.Contract(this.address, this.abi, this.provider);
    this.defineContractProperties();
  }

  /**
   * Binds the contract to a `signer` - a SmartBchWallet instance
   * which is able to sign transactions with a private key and thus spend the gas for contract interaction
   *
   * @note the network and network provider will be changed to those of the `signer`
   *
   * @param signer a SmartBchWallet instance
   *
   * @returns this contract
   */
  public setSigner(signer: SmartBchWallet) {
    this.network = signer.network;
    this.provider = signer.provider!;
    this.signer = signer.ethersWallet!;
    this.contract = this.contract.connect(this.signer || this.provider);

    return this;
  }

  /**
   * Binds this contract to another address, preserving the ABI
   *
   * @param address Address of an already deployed contract
   *
   * @returns this contract
   */
  public setAddress(address: string) {
    if (address !== this.address) {
      this.address = address;
      this.contract = this.contract
        .attach(address)
        .connect(this.signer || this.provider);
    }

    return this;
  }

  /**
   * Instantiates a new Contract class with an ethers.Contract class,
   * optionally preserving the solidity source code and contract constructor parameters
   *
   * @param contract ethers.Contract instance created elsewhere
   * @param script (optional) solidity source code used to create this contract instance
   * @param parameters (optional) constructor parameters used to create this contract instance
   * @param network (optional) network on which the contract to be interacted with
   * @param signer (optional) a SmartBchWallet instance which allows for spending gas for non read-only interactions with this contract
   *
   * @returns {Contract} new Contract
   */
  public static fromEthersContract(
    contract: ethers.Contract,
    script: string = "",
    parameters: any[] = [],
    network: Network = NetworkType.Mainnet,
    signer?: SmartBchWallet
  ): Contract {
    const result = new Contract(
      contract.address,
      contract.interface.format(ethers.utils.FormatTypes.full),
      network
    );
    result.parameters = parameters;
    result.script = script;

    if (signer) {
      result.setSigner(signer);
    }

    return result;
  }

  /**
   * convenience contract function accessors as object properties
   */
  readonly [key: string]: ethers.ContractFunction | any;

  /**
   * defineContractProperties - Set up the convenience contract function accessors as object properties
   * @example you can use contract.mint(to, value) instead of contract.getFunctionByName('mint')(to, value)
   *
   */
  private defineContractProperties() {
    Object.keys(this.contract.interface.functions).forEach((signature) => {
      const fragment = this.contract.interface.functions[signature];

      const fn = async (...args: Array<any>): Promise<any> => {
        return this.getFunctionByName(fragment.name)(...args);
      };

      ethers.utils.defineReadOnly(this, fragment.name, fn as any);
    });
  }

  /**
   * getContractText - get the source code of a contract
   *
   * @returns Contract source code
   */
  public getContractText(): string {
    return this.script;
  }

  /**
   * getSerializedAbi - Serialize just the source code component of a contract
   *
   * @returns A serialized source code
   */
  public getSerializedText(): string {
    return btoa(this.getContractText());
  }

  /**
   * getContractText - get the ABI of a contract
   *
   * @returns Contract ABI
   */
  public getContractAbi(): ethers.ContractInterface {
    return this.abi;
  }

  /**
   * getSerializedAbi - Serialize just the ABI component of a contract
   *
   * @returns A serialized ABI
   */
  public getSerializedAbi() {
    return btoa(JSON.stringify(this.getContractAbi()));
  }

  /**
   * getSerializedParameters - Serialize just the parameters of a contract
   *
   * @returns The serialized parameters
   */
  public getSerializedParameters() {
    return btoa(JSON.stringify(this.parameters));
  }

  /**
   * getParameterList - Get the parameters as a list
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
   * @returns A serialized contract
   */
  public toString() {
    return [
      "smartbchcontract",
      this.network,
      this.getDepositAddress(),
      this.getSerializedAbi(),
      this.getSerializedText(),
      this.getSerializedParameters(),
    ].join(DELIMITER);
  }

  /**
   * fromId - Deserialize a contract from a string
   *
   * @returns A new contract
   */
  public static fromId(contractId: string) {
    const [
      _,
      network,
      address,
      serializedAbi,
      serializedScript,
      serializedParams,
    ] = contractId.split(DELIMITER);
    const abi = JSON.parse(atob(serializedAbi));
    const script = atob(serializedScript);
    const parameters = JSON.parse(atob(serializedParams));

    const contract = new Contract(address, abi, network as Network);

    contract.parameters = parameters;
    contract.script = script;

    return contract;
  }

  /**
   * getDepositAddress Get the contract address
   *
   * @returns The address for a contract
   */
  public getDepositAddress() {
    return this.contract.address;
  }

  /**
   * Get the information about the contract
   *
   * a high-level function
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/smartbch/contract/info} REST endpoint
   * @returns The contract info
   */
  public info(): ContractInfoResponseI {
    return {
      contractId: this.toString(),
      address: this.getDepositAddress(),
      abi: this.getContractAbi(),
      script: this.getContractText(),
      parameters: this.getParameterList(),
    };
  }

  /**
   * runFunctionFromStrings -  Call a SmartBch contract function using an interface object of strings.
   *
   * This is a helper function for the REST or serialized interfaces and not intended
   * for native use within the library, although it may be useful for running stored transactions.
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/smartbch/contract/call} REST endpoint
   *
   * @param request Parameters for the transaction call, serialized as strings.
   * @returns A contract interaction result
   */
  public async runFunctionFromStrings(
    request: ContractFnRequestI
  ): Promise<ContractFnResponseI> {
    if (request.arguments === undefined) {
      request.arguments = [];
    }

    if (request.overrides === undefined) {
      request.overrides = {};
    }

    const result: ethers.providers.TransactionResponse | any =
      await this.contract[request.function](
        ...request.arguments,
        request.overrides
      );

    if (typeof result === "object" && result.hasOwnProperty("confirmations")) {
      const receipt = await (
        result as ethers.providers.TransactionResponse
      ).wait();
      return {
        txId: receipt.transactionHash,
        receipt: receipt,
      };
    }

    return {
      result: result,
    };
  }

  /**
   * getFunctionByName -  get a contract function to evaluate by its name
   *
   * @param funcName function name
   * @returns {ethers.ContractFunction} A contract function ready to be evaluated
   */
  public getFunctionByName(funcName: string): ethers.ContractFunction {
    if (typeof this.contract.functions[funcName] === "function") {
      return this.contract[funcName];
    } else {
      throw Error(`${funcName} is not a contract method`);
    }
  }

  /**
   * estimateGas - estimate the gas amount to be payed for executing a state-changing function
   *
   * @param funcName function name
   * @param args function arguments
   *
   * @note args may contain overrides as last element
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/smartbch/contract/estimate_gas} REST endpoint
   *
   * @returns {ethers.BigNumber} gas amount the function will consume given the arguments in base units (wei)
   */
  public async estimateGas(
    funcName: string,
    ...args
  ): Promise<ethers.BigNumber> {
    const fragment = this.contract.interface.getFunction(funcName);
    if (fragment.constant) {
      return ethers.BigNumber.from(0);
    }

    return this.contract.estimateGas[funcName](...args);
  }

  /**
   * Create a new contract, but respond with a json object
   * @param request A contract request object
   * @returns A new contract object
   */
  public static contractRespFromJsonRequest(
    request: ContractRequestI
  ): ContractResponseI {
    let contract = new Contract(request.address, request.abi, request.network);

    return {
      contractId: contract.toString(),
      address: contract.getDepositAddress(),
    };
  }

  /**
   * isDeployed - check if the contract is deployed to the network and is ready for interactions
   *
   * @returns {boolean} true if deployed
   */
  public async isDeployed(): Promise<boolean> {
    try {
      await this.contract.deployed();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * deploy - deploy contract from solidity source code
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/smartbch/contract/deploy} REST endpoint
   *
   * @param {SmartBchWallet} signer a SmartBchWallet which pays gas fees on contract deployment
   * @param solidityScript the contract source code written in solidity language
   * @param parameters contract constructor parameters
   *
   * @returns {Contrac} newly created contract
   */
  public static async deploy(
    signer: SmartBchWallet,
    solidityScript: string,
    ...parameters: any[]
  ): Promise<Contract> {
    if (signer.walletType === WalletTypeEnum.Watch) {
      throw Error("Cannot deploy contracts with Watch-Only wallets");
    }

    const input = {
      language: "Solidity",
      sources: {
        main: {
          content: solidityScript,
        },
      },
      settings: {
        outputSelection: {
          "*": {
            "*": ["abi", "evm"],
          },
        },
      },
    };

    const compiled = JSON.parse(
      await solc.compile(JSON.stringify(input), {
        import: Contract.findImports,
      })
    );
    const errors = (compiled.errors || []).filter(
      (error: any) => error.severity === "error"
    );
    if (errors.length) {
      throw new Error(JSON.stringify(errors, null, 2));
    }

    const artifact =
      compiled.contracts.main[Object.keys(compiled.contracts.main)[0]];
    const factory = ContractFactory.fromSolidity(
      artifact,
      signer.ethersWallet!
    );

    let overrides: ethers.CallOverrides = {};

    // If 1 extra parameter was passed in, it contains overrides
    if (parameters.length === factory.interface.deploy.inputs.length + 1) {
      overrides = parameters.pop();
    }

    const contract = await factory.deploy(...parameters, overrides);
    contract.deployTransaction.data = "";
    const receipt = await contract.deployTransaction.wait();

    const result = Contract.fromEthersContract(
      contract,
      solidityScript,
      parameters,
      signer.network,
      signer
    );
    result.contract = contract;
    result.deployReceipt = receipt;

    return result;
  }

  /**
   * findImports - utility function for the solidity import resolution
   *
   * @note this handler resolves the popular openzeppelin packages.
   * If ran in node, the imports are read from disk, otherwise from github
   *
   * @note this handler resolves any external dependencies from web, recognized by https:// prefix
   *
   * @param path import path as encountered in the solidity source code
   *
   * @returns resolved solidity module or error
   */
  public static findImports(path: string): { contents?: any; error?: any } {
    let url: string = "";
    if (path.indexOf("@openzeppelin") === 0) {
      // lookup node_modules
      const nodePath = `${process.cwd()}/node_modules/${path}`;
      if (fs.existsSync(nodePath)) {
        return {
          contents: fs.readFileSync(nodePath, "utf8"),
        };
      }

      // otherwise download from openzeppelin github
      url = path.replace(
        "@openzeppelin",
        "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/master"
      );
    } else if (path.indexOf("https://") === 0) {
      // any other external web resources
      url = path;
    }

    if (url) {
      var request = new XMLHttpRequest();
      request.open("GET", url, false);
      request.send(null);

      return {
        contents: request.responseText,
      };
    }

    return { error: `Can not resolve import ${path}.` };
  }
}
