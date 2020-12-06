import { instantiateSecp256k1, binToHex } from "@bitauth/libauth";
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
import { ContractI } from "./interface";
import { atob, btoa } from "../util/base64";
import { castParametersFromConstructor } from "./util";
import { GROUP_DELIMITER, ROW_DELIMITER } from "../constant";

export class Contract implements ContractI {
  private script: string;
  public parameters: Argument[];
  private artifact: Artifact;
  private contract: CashScriptContract;
  private provider: NetworkProvider;
  public network: Network;

  constructor(script: string, parameters: any, network: Network) {
    this.script = script;
    this.parameters = parameters;
    this.network = network ? network : "mainnet";
    this.artifact = this.getArtifact();
    this.provider = getNetworkProvider(this.network);
    this.contract = this.getContactInstance();
  }

  getContractText(): string | Error {
    return this.script;
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
    return this.parameters.map((a) => btoa(a.toString())).join(ROW_DELIMITER);
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
    ].join(GROUP_DELIMITER);
  }

  // Deserialize from a string
  public static fromId(contractId: string) {
    let [network, serializedParams, serializedScript] = contractId.split(
      GROUP_DELIMITER
    );
    let script = atob(serializedScript);
    let contractTemplate = CashCompiler.compileString(script);
    let paramStrings = serializedParams
      .split(ROW_DELIMITER)
      .map((s) => atob(s));
    let params = castParametersFromConstructor(
      paramStrings,
      contractTemplate.constructorInputs
    );

    return new Contract(script, params, network as Network);
  }

  public getAddress() {
    return this.contract.address;
  }

  public getUtxos() {
    return this.contract.getUtxos();
  }

  public getBalance() {
    return this.contract.getBalance();
  }

  private getContactInstance() {
    return new CashScriptContract(
      this.artifact,
      this.parameters,
      this.provider
    );
  }

  public fromCashScript() {
    this.artifact = CashCompiler.compileFile(this.script);
    this.contract = new CashScriptContract(this.artifact, [], this.provider);
    return this;
  }

  public static fromCashScript(script: string, parameters, network: Network) {
    return new this(script, parameters, network).fromCashScript();
  }

  public call(method: string, args) {
    this.contract.functions[method](args);
  }

  private async estimateFee(func, publicKey, sig, outputAddress, utxos) {
    const feePerByte = 1;
    // Create an estimate transaction with zero fees, sending nominal balance
    const estimatorTransaction = func(publicKey, sig, 10, 0)
      .to([{ to: outputAddress, amount: 10 }])
      .from(utxos);
    const estimatedTxHex = (await estimatorTransaction
      .withHardcodedFee(10)
      ["build"]()) as string;

    // Use the feePerByte to get the fee for the transaction length
    return Math.round(estimatedTxHex.length * 2 * feePerByte);
  }
  // TODO refactor, split out fee estimator, amount estimator
  public async _sendMax(
    wif: string,
    funcName: string,
    outputAddress: string,
    getHexOnly = false,
    utxos?: UtxoI[],
    nonce?: number
  ) {
    const sig = new SignatureTemplate(wif);
    const secp256k1 = await instantiateSecp256k1();
    let publicKey = sig.getPublicKey(secp256k1);
    nonce = nonce ? nonce : 0;
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
        const balance = await this.getBalance();
        const amount = balance - fee;
        if (balance - fee < 0) {
          throw Error(
            "The contract transaction requires a greater fee then available with contract balance"
          );
        }
        let transaction = func(publicKey, sig, amount, nonce)
          .withHardcodedFee(fee)
          .to(outputAddress, amount);
        let txResult = await transaction[method]();

        if (getHexOnly) {
          return { tx: txResult.txid, fee: fee, utxo: utxos };
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
