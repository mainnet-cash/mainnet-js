import { binToHex } from "@bitauth/libauth";
import {
  Artifact,
  Contract as CashScriptContract,
  ConstructorArgument,
  ContractFunction,
  NetworkProvider,
  SignatureTemplate,
} from "cashscript";
import { compileString, compileFile } from "cashc";

import {
  CONST,
  fromUtxoId,
  getNetworkProvider,
  Mainnet,
  Network,
  UtxoI,
} from "mainnet-js";

import {
  ContractI,
  CashscriptTransactionI,
  ContractResponseI,
  ContractInfoResponseI,
} from "./interface.js";
import {
  castConstructorParametersFromArtifact,
  castStringArgumentsFromArtifact,
  transformContractToRequests,
} from "./util.js";
import WrappedProvider, { toCashScript, toMainnet } from "./WrappedProvider.js";

/**
 * Class that manages the Contract source, network, parameters, CashScript artifact and calls
 */
export class Contract implements ContractI {
  private script: string;
  public parameters: ConstructorArgument[];
  public artifact: Artifact;
  private contract: CashScriptContract;
  private provider: NetworkProvider;
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
    script: string,
    parameters: any,
    network: Network,
    nonce?: number
  ) {
    this.script = script;
    this.parameters = parameters.map((val) =>
      typeof val === "number" ? BigInt(val) : val
    );
    this.network = network ? network : "mainnet";
    this.artifact = compileString(script);
    this.provider = new WrappedProvider(
      getNetworkProvider(this.network) as any
    );
    this.contract = this.getContractInstance();
    this.nonce = nonce ? nonce : Mainnet.getWeakRandomInt(2147483647);
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
    return Mainnet.btoa(this.script);
  }

  /**
   * getSerializedParameters - Serialize just the parameters of a contract
   *
   * a low-level function
   *
   * @returns The serialized parameters
   */
  public getSerializedParameters() {
    return Mainnet.btoa(
      this.parameters
        .map((a) => Mainnet.btoa(a.toString()))
        .join(CONST.DELIMITER)
    );
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
      ArrayBuffer.isView(x) ? binToHex(new Uint8Array(x.buffer)) : x
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
    ].join(CONST.DELIMITER);
  }

  /**
   * fromId - Deserialize a contract from a string
   *
   * an intermediate function
   *
   * @returns A new contract
   */
  public static fromId(contractId: string) {
    const [type, network, serializedParams, serializedScript, nonce] =
      contractId.split(CONST.DELIMITER);
    const script = Mainnet.atob(serializedScript);
    const artifact = compileString(script);
    const paramStrings = Mainnet.atob(serializedParams)
      .split(CONST.DELIMITER)
      .map((s) => Mainnet.atob(s));
    const params = castConstructorParametersFromArtifact(
      paramStrings,
      artifact
    );

    return new Contract(script, params, network as Network, parseInt(nonce));
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
    nonce?: number
  ): Contract {
    const artifact = compileString(script);
    const params = castConstructorParametersFromArtifact(parameters, artifact);
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
  public getDepositAddress(): string {
    return this.contract.address;
  }

  /**
   * Get the unspent transaction outputs of the contract
   *
   * an intermediate function
   *
   * @note For REST, the address is automatically returned from the create interface
   * @returns The address for a contract
   */
  public getTokenDepositAddress(): string {
    return this.contract.tokenAddress;
  }

  /**
   * Get the unspent transaction outputs of the contract
   *
   * a high-level function
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/contract/utxos} REST endpoint
   * @returns A list of utxos on the contract
   */
  public async getUtxos(): Promise<UtxoI[]> {
    return (await this.provider.getUtxos(this.getDepositAddress())).map(
      toMainnet
    );
  }

  /**
   * Get the current balance of the contract
   *
   * @returns The balance in satoshi
   */
  public async getBalance(): Promise<number> {
    return Number(await this.contract.getBalance());
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
      tokenaddr: this.contract.tokenAddress,
      script: this.script,
      parameters: this.getParameterList()
        // map bigints to numbers for REST service.
        .map((val) => (typeof val === "bigint" ? Number(val) : val)),
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
    return new CashScriptContract(this.artifact, this.parameters, {
      provider: this.provider,
      addressType: "p2sh20",
    });
  }

  /**
   * fromCashScript - initialize the artifact and cashscript object from existing script
   * @returns A cashscript Contract
   */
  public fromCashScript() {
    this.artifact = compileFile(this.script);
    this.contract = new CashScriptContract(this.artifact, [], {
      provider: this.provider,
      addressType: "p2sh20",
    });
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
  public static fromCashScript(
    script: string,
    parameters: ConstructorArgument[],
    network: Network,
    nonce: number
  ) {
    return new this(script, parameters, network, nonce).fromCashScript();
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
  public async runFunctionFromStrings(
    request: CashscriptTransactionI
  ): Promise<any> {
    const fn = this.getContractFunction(request.function);
    const arg = await castStringArgumentsFromArtifact(
      request.arguments,
      this.artifact,
      request.function
    );
    let func = fn(...arg);
    func = func.to(await transformContractToRequests(request.to));
    if (request.utxoIds) {
      const utxos = request.utxoIds.map(fromUtxoId).map(toCashScript);
      func = func.from(utxos);
    }
    if (request.opReturn) {
      func = func.withOpReturn(request.opReturn);
    }
    if (request.feePerByte) {
      func = func.withFeePerByte(request.feePerByte);
    }
    if (request.hardcodedFee) {
      func = func.withHardcodedFee(BigInt(request.hardcodedFee));
    }
    if (request.minChange) {
      func = func.withMinChange(BigInt(request.minChange));
    }
    if (request.withoutChange) {
      func = func.withoutChange();
    }
    if (request.age) {
      func = func.withAge(request.age);
    }
    if (request.time) {
      func = func.withTime(request.time);
    }
    return await func[request.action]();
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
    publicKey: Uint8Array,
    sig: SignatureTemplate,
    outputAddress: string,
    utxos: UtxoI[]
  ) {
    const feePerByte = 1;
    // Create an estimate transaction with zero fees, sending nominal balance
    const estimatorTransaction = func(publicKey, sig, 10n, 2147483640n)
      .to([{ to: outputAddress, amount: 1000n }])
      .from(utxos.map(toCashScript));
    const estimatedTxHex = (await estimatorTransaction
      .withHardcodedFee(500n)
      ["build"]()) as string;

    // Use the feePerByte to get the fee for the transaction length
    return Math.round((estimatedTxHex.length / 2) * feePerByte);
  }

  /**
   * Create a new contract, but respond with a json object
   * @param request A contract request object
   * @returns A new contract object
   */
  public static contractRespFromJsonRequest(request: any): ContractResponseI {
    const contract = Contract._create(
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
}
