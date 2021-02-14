import { instantiateSecp256k1 } from "@bitauth/libauth";
import {
  Argument,
  Artifact,
  CashCompiler,
  Contract as CashScriptContract,
  SignatureTemplate,
  NetworkProvider,
} from "cashscript";
import { getNetworkProvider } from "../network/default";
import { Network, UtxoI } from "../interface";
import { ContractI, CashscriptTransactionI } from "./interface";
import { atob, btoa } from "../util/base64";
import { getRandomInt } from "../util/randomInt";
import {
  castConstructorParametersFromArtifact,
  castStringArgumentsFromArtifact,
  transformContractToRequests,
} from "./util";
import { sumUtxoValue } from "../util/sumUtxoValue";
import { DELIMITER } from "../constant";
import { ContractFunction } from "cashscript/dist/module/Contract";
import { UtxoItem } from "../wallet/model";

export class Contract implements ContractI {
  private script: string;
  public parameters: Argument[];
  private artifact: Artifact;
  private contract: CashScriptContract;
  private provider: NetworkProvider;
  public network: Network;
  private nonce: number;

  constructor(
    script: string,
    parameters: any,
    network: Network,
    nonce?: number
  ) {
    this.script = script;
    this.parameters = parameters;
    this.network = network ? network : "mainnet";
    this.artifact = CashCompiler.compileString(script);
    this.provider = getNetworkProvider(this.network);
    this.contract = this.getContractInstance();
    this.nonce = nonce ? nonce : getRandomInt(2147483647);
  }

  getContractText(): string | Error {
    return this.script;
  }

  getNonce() {
    return this.nonce;
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
      this.network,
      this.getSerializedParameters(),
      this.getSerializedScript(),
      this.nonce,
    ].join(DELIMITER);
  }

  /**
   * getSerializedScript - Serialize just the script component of a contract
   *
   * a low-level function
   *
   * @returns A serialized script
   */
  private getSerializedScript() {
    return btoa(this.script);
  }

  /**
   * getSerializedParameters - Serialize just the parameters of a contract
   *
   * a low-level function
   *
   * @returns A serialized script
   */
  private getSerializedParameters() {
    return btoa(this.parameters.map((a) => btoa(a.toString())).join(DELIMITER));
  }

  /**
   * fromId - Deserialize a contract from a string
   *
   * an intermediate function
   *
   * @returns A new contract
   */
  public static fromId(contractId: string) {
    let [network, serializedParams, serializedScript, nonce] = contractId.split(
      DELIMITER
    );
    let script = atob(serializedScript);
    let artifact = CashCompiler.compileString(script);
    let paramStrings = atob(serializedParams)
      .split(DELIMITER)
      .map((s) => atob(s));
    let params = castConstructorParametersFromArtifact(paramStrings, artifact);

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
    nonce?
  ) {
    let artifact = CashCompiler.compileString(script);
    let params = castConstructorParametersFromArtifact(parameters, artifact);
    return new this(script, params, network, nonce);
  }

  public getDepositAddress() {
    return this.contract.address;
  }

  /**
   * Get the unspent transaction outputs of the contract
   *
   * a high-level function
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/contract/contractUtxos|/contract/utxos} REST endpoint
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
   * @returns The balance in satoshi
   */
  public getBalance() {
    return this.contract.getBalance();
  }

  /**
   * getContractInstance - get the object directly as a cashscript contract.
   * @returns A Cashscript Contract
   */
  private getContractInstance() {
    return new CashScriptContract(
      this.artifact,
      this.parameters,
      this.provider
    );
  }

  /**
   * fromCashScript - initialize the artifact and cashscript object from existing script
   * @returns A cashscript Contract
   */
  public fromCashScript() {
    this.artifact = CashCompiler.compileFile(this.script);
    this.contract = new CashScriptContract(this.artifact, [], this.provider);
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
    parameters: Argument[],
    network: Network,
    nonce: number
  ) {
    return new this(script, parameters, network, nonce).fromCashScript();
  }

  /**
   * Get a function object from a contract
   * @param funcName The string identifying the function in the cashscript contract
   * @returns A cashscript Transaction
   */
  public getContractFunction(funcName: string) {
    return this.contract.functions[funcName];
  }

  /**
   * Call a cashscript contract function using an interface object of strings.
   * This function is a helper for the rest or serialized interfaces and not intended
   * for native use within the library, although it may be useful for running stored transactions.
   * @param request Parameters for the transaction call, serialized as strings.
   * @returns A cashscript Transaction result
   */
  public async runFunctionFromStrings(request: CashscriptTransactionI) {
    let fn = this.getContractFunction(request.function);
    let arg = await castStringArgumentsFromArtifact(
      request.arguments,
      this.artifact,
      request.function
    );
    let func = fn(...arg);
    func = func.to(await transformContractToRequests(request.to));
    if (request.utxoIds) {
      let utxos = request.utxoIds.map((u) => {
        return UtxoItem.fromId(u).asElectrum();
      });
      func = func.from(utxos);
    }
    if (request.opReturn) {
      func = func.withOpReturn(request.opReturn);
    }
    if (request.feePerByte) {
      func = func.withFeePerByte(request.feePerByte);
    }
    if (request.hardcodedFee) {
      func = func.withHardcodedFee(request.hardcodedFee);
    }
    if (request.minChange) {
      func = func.withMinChange(request.minChange);
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

  private async estimateFee(
    func: ContractFunction,
    publicKey: Uint8Array,
    sig: SignatureTemplate,
    outputAddress: string,
    utxos: UtxoI[]
  ) {
    const feePerByte = 1;
    // Create an estimate transaction with zero fees, sending nominal balance
    const estimatorTransaction = func(publicKey, sig, 10, 2147483640)
      .to([{ to: outputAddress, amount: 1000 }])
      .from(utxos);
    const estimatedTxHex = (await estimatorTransaction
      .withHardcodedFee(1000)
      ["build"]()) as string;

    // Use the feePerByte to get the fee for the transaction length
    return Math.round(estimatedTxHex.length * 2 * feePerByte);
  }

  public async _sendMax(
    wif: string,
    funcName: string,
    outputAddress: string,
    getHexOnly = false,
    utxoIds?: string[]
  ) {
    const sig = new SignatureTemplate(wif);
    const secp256k1 = await instantiateSecp256k1();
    let publicKey = sig.getPublicKey(secp256k1);
    let func;
    if (typeof this.contract.functions[funcName] === "function") {
      func = this.contract.functions[funcName];
    } else {
      throw Error(`${funcName} is not a contract method`);
    }

    // If getHexOnly is true, just return the tx hex, otherwise submit to the network
    const method = getHexOnly ? "build" : "send";

    // If no utxos were provided, automatically get them
    let utxos;
    if (typeof utxoIds === "undefined") {
      utxos = await this.contract.getUtxos();
    } else {
      console.log("here");
      utxos = utxoIds.map((u) => {
        return UtxoItem.fromId(u).asElectrum();
      });
    }
    if (utxos.length > 0) {
      try {
        const fee = await this.estimateFee(
          func,
          publicKey,
          sig,
          outputAddress,
          utxos
        );
        const balance = await sumUtxoValue(utxos);

        const amount = balance - fee;
        if (balance - fee < 0) {
          throw Error(
            "The contract transaction requires a greater fee then available with contract balance"
          );
        }
        let transaction = func(publicKey, sig, amount, this.nonce)
          .withHardcodedFee(fee)
          .from(utxos)
          .to(outputAddress, amount);
        let txResult = await transaction[method]();

        if (getHexOnly) {
          return { hex: txResult };
        } else {
          return txResult;
        }
      } catch (e) {
        throw Error(e);
      }
    } else {
      throw Error("There were no UTXOs provided or available on the contract");
    }
  }
}
