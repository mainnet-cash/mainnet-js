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
import { deserializeUtxo } from "../util/serializeUtxo";
import {
  castConstructorParametersFromArtifact,
  castStringArgumentsFromArtifact,
} from "./util";
import { sumUtxoValue } from "../util/sumUtxoValue";
import { DELIMITER } from "../constant";

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
    this.artifact = this.getArtifact();
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

  getArtifact() {
    const contractText = this.script;
    if (typeof contractText === "string") {
      return CashCompiler.compileString(contractText);
    }
    // If the contract text is not a string, it's an error to be thrown
    else {
      throw contractText;
    }
  }

  private getSerializedParameters() {
    return btoa(this.parameters.map((a) => btoa(a.toString())).join(DELIMITER));
  }

  private getSerializedScript() {
    return btoa(this.script);
  }

  // Serialize the contract
  public toString() {
    return [
      this.network,
      this.getSerializedParameters(),
      this.getSerializedScript(),
      this.nonce,
    ].join(DELIMITER);
  }

  // Deserialize from a string
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

  // Static convenience constructor
  static _create(
    script:string,
    parameters:string[],
    network:Network,
    nonce?
  ) {
    let artifact = CashCompiler.compileString(script);
    let params = castConstructorParametersFromArtifact(parameters, artifact);
    return new this( script, params, network, nonce );
  }

  

  public getDepositAddress() {
    return this.contract.address;
  }

  /**
   * Get the unspent transaction outputs of the contract
   * @returns A promise to the utxos of the contract
   */
  public getUtxos() {
    return this.contract.getUtxos();
  }

  /**
   * Get the current balance of the contract
   * @returns The balance in satoshi
   */
  public getBalance() {
    return this.contract.getBalance();
  }

  private getContractInstance() {
    return new CashScriptContract(
      this.artifact,
      this.parameters,
      this.provider
    );
  }

  /**
   * Get a contract object the wrapper object
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
   * @returns A cashscript Contract
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
   * @param req Parameters for the transaction call, serialized as strings.
   * @returns A cashscript Transaction result
   */
  public async runFunctionFromStrings(req: CashscriptTransactionI) {
    let fn = this.getContractFunction(req.function);
    let arg = await castStringArgumentsFromArtifact(
      req.arguments,
      this.artifact,
      req.function
    );
    let func = fn(...arg);
    func = func.to(req.to.cashaddr, req.to.value);
    if (req.utxoIds) {
      let utxos = req.utxoIds.map((u) => {
        return deserializeUtxo(u);
      });
      func = func.from(utxos);
    }
    if (req.opReturn) {
      func = func.withOpReturn(req.opReturn);
    }
    if (req.feePerByte) {
      func = func.withFeePerByte(req.feePerByte);
    }
    if (req.hardcodedFee) {
      func = func.withHardcodedFee(req.hardcodedFee);
    }
    if (req.minChange) {
      func = func.withMinChange(req.minChange);
    }
    if (req.withoutChange) {
      func = func.withoutChange();
    }
    if (req.age) {
      func = func.withAge(req.age);
    }
    if (req.time) {
      func = func.withTime(req.time);
    }
    return await func[req.action]();
  }

  private async estimateFee(func, publicKey, sig, outputAddress, utxos) {
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
    utxos?: UtxoI[]
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
    if (typeof utxos === "undefined") {
      utxos = await this.contract.getUtxos();
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
