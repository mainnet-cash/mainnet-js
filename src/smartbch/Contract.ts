import { binToHex } from "@bitauth/libauth";
import { getNetworkProvider } from "./Network";
import { Network, UtxoI } from "../interface";
import { atob, btoa } from "../util/base64";
import { DELIMITER } from "../constant";
import {
  ContractI,
  ContractInfoResponseI,
  ContractResponseI,
} from "../contract/interface";
import { ContractFactory, ContractInterface, ethers, Wallet } from "ethers";
import { NetworkType } from "../enum";
import {
  castConstructorParametersFromArtifact,
  castStringArgumentsFromArtifact,
  transformContractToRequests,
} from "../contract/util";
import { defineReadOnly } from "ethers/lib/utils";
import solc from "solc";
import { XMLHttpRequest } from "xmlhttprequest-ssl";
import { SmartBchWallet } from "./SmartBchWallet";
import { WalletTypeEnum } from "../wallet/enum";
import fs from "fs";

export type Argument = number | boolean | string | Uint8Array;

/**
 * Class that manages the Contract source, network, parameters, CashScript artifact and calls
 */
export class Contract implements ContractI {
  private address: string;
  public abi: ContractInterface;
  public parameters: Argument[];
  public contract: ethers.Contract;
  private provider: ethers.providers.Provider;
  public network: Network = NetworkType.Mainnet;
  private nonce: number;
  private signer?: ethers.Signer;

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
    abi: ContractInterface,
    parameters: Argument[] = [],
    network: Network = Network.MAINNET,
    nonce?: number
  ) {
    this.parameters = parameters;
    this.address = address;
    this.abi = abi;
    this.network = network ? network : "mainnet";
    this.provider = getNetworkProvider(this.network as NetworkType);

    this.contract = new ethers.Contract(this.address, this.abi, this.provider);
    this.defineContractProperties();

    this.nonce = nonce ? nonce : 0;
  }

  public setSigner(signer: SmartBchWallet) {
    this.network = signer.network;
    this.provider = signer.provider!;
    this.signer = signer.ethersWallet!;
    this.contract = this.contract.connect(this.signer || this.provider);

    return this;
  }

  public setContract(contract: ethers.Contract) {
    this.address = contract.address;
    this.abi = contract.interface;
    this.contract = contract;
    this.contract.connect(this.signer || this.provider);
    this.defineContractProperties();

    return this;
  }

  public setAddress(address: string) {
    if (address !== this.address) {
      this.address = address;
      this.contract = this.contract
        .attach(address)
        .connect(this.signer || this.provider);
    }

    return this;
  }

  public static fromEthersContract(
    contract: ethers.Contract,
    parameters: any[] = [],
    network: Network = NetworkType.Mainnet,
    signer?: SmartBchWallet
  ) {
    const result = new Contract(
      contract.address,
      contract.interface,
      parameters,
      network
    );
    if (signer) {
      result.setSigner(signer);
    }

    return result;
  }

  readonly [key: string]: ethers.ContractFunction | any;

  private defineContractProperties() {
    Object.keys(this.contract.interface.functions).forEach((signature) => {
      const fragment = this.contract.interface.functions[signature];

      const fn = async (...args: Array<any>): Promise<any> => {
        return this.getFunctionByName(fragment.name)(...args);
      };

      defineReadOnly(this, fragment.name, fn as any);
    });
  }

  public getContractText(): string {
    return JSON.stringify(this.abi);
  }

  public getNonce() {
    return this.nonce;
  }

  /**
   * getSerializedAbi - Serialize just the script component of a contract
   *
   * a low-level function
   *
   * @returns A serialized script
   */
  public getSerializedAbi() {
    return btoa(this.getContractText());
  }

  /**
   * getSerializedParameters - Serialize just the parameters of a contract
   *
   * a low-level function
   *
   * @returns The serialized parameters
   */
  public getSerializedParameters() {
    return btoa(JSON.stringify(this.parameters));
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
      this.getDepositAddress(),
      this.getSerializedParameters(),
      this.getSerializedAbi(),
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
    let [_, network, address, serializedParams, serializedScript, nonce] =
      contractId.split(DELIMITER);
    let abi = JSON.parse(atob(serializedScript));
    // let artifact = compileString(script);
    let paramStrings = JSON.parse(atob(serializedParams));
    // let params = castConstructorParametersFromArtifact(paramStrings, artifact);

    return new Contract(
      address,
      abi,
      paramStrings,
      network as Network,
      parseInt(nonce)
    );
  }

  // /**
  //  * _create - Static convenience method for the constructor
  //  *
  //  * an intermediate function similar to the constructor for rest
  //  *
  //  * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/contract/createContract|/contract/create} REST endpoint
  //  * @returns A new contract
  //  */
  // static _create(
  //   script: string,
  //   parameters: string[],
  //   network: Network,
  //   nonce?
  // ) {
  //   let artifact = compileString(script);
  //   let params = castConstructorParametersFromArtifact(parameters, artifact);
  //   return new this("", script, params, network, nonce);
  // }

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

  // /**
  //  * Get the address balance of the contract
  //  *
  //  * @param address address to query balance of
  //  *
  //  * @returns The balance in satoshi
  //  */
  // public async getBalance(address: string): Promise<number> {
  //   return (await this.contract.balanceOf(address)).div(10**10).toNumber();
  // }

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
      script: this.getContractText(),
      parameters: this.getParameterList(),
      nonce: this.nonce,
    };
  }

  public _info(): ContractInfoResponseI {
    return this.info();
  }

  /**
   * fromScript - initialize the artifact and cashscript object from existing script
   * @returns A cashscript Contract
   */
  public fromScript() {
    this.contract = new ethers.Contract(this.address, this.abi, this.provider);
    return this;
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
    overrides?: ethers.CallOverrides;
  }) {
    if (request.overrides === undefined) {
      request.overrides = {};
    }

    if (request.overrides.nonce === undefined) {
      request.overrides.nonce = this.nonce;
    }

    return this.contract[request.function](...arguments, request.overrides);
  }

  public getFunctionByName(funcName: string) {
    if (typeof this.contract.functions[funcName] === "function") {
      return this.contract[funcName];
    } else {
      throw Error(`${funcName} is not a contract method`);
    }
  }

  public async estimateFee(funcName: string, ...args) {
    return this.contract.estimateGas[funcName](...args);
  }

  // /**
  //  * Create a new contract, but respond with a json object
  //  * @param request A contract request object
  //  * @returns A new contract object
  //  */
  // public static contractRespFromJsonRequest(request: any): ContractResponseI {
  //   let contract = Contract._create(
  //     request.script,
  //     request.parameters,
  //     request.network
  //   );
  //   if (contract) {
  //     return {
  //       contractId: contract.toString(),
  //       cashaddr: contract.getDepositAddress(),
  //     };
  //   } else {
  //     throw Error("Error creating contract");
  //   }
  // }

  public async isDeployed() {
    return this.contract.deployed();
  }

  public static async deploy(
    signer: SmartBchWallet,
    solidityScript: string,
    ...args: Array<any>
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
      solc.compile(JSON.stringify(input), { import: Contract.findImports })
    );
    const errors = (compiled.errors || []).filter(
      (error) => error.severity === "error"
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
    if (args.length === factory.interface.deploy.inputs.length + 1) {
      overrides = args.pop();
    }

    const contract = await factory.deploy(...args, overrides);
    contract.deployTransaction.data = "";
    const receipt = await contract.deployTransaction.wait();
    (contract as any).deployReceipt = receipt;

    const result = Contract.fromEthersContract(
      contract,
      args,
      signer.network,
      signer
    );
    result.contract = contract;

    return result;
  }

  public static findImports(path: string) {
    let url;
    if (path.indexOf("@openzeppelin") === 0) {
      const nodePath = `${process.cwd()}/node_modules/${path}`;
      if (fs.existsSync(nodePath)) {
        return {
          contents: fs.readFileSync(nodePath, "utf8"),
        };
      }

      url = path.replace(
        "@openzeppelin",
        "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/master"
      );
    } else if (path.indexOf("https://") === 0) {
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
