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
import { Network, Utxo } from "../interface";

export default interface ContractInterface {
  /**
   * toString should return a serialized representation of the contract
   * @returns returns a serialized representation of the contract
   */
  toString(): string;
  getAddress(): string | Error;

  /**
   * getContractText should return the cashscript text
   * @returns returns contract in script as a string
   */
  getContractText(): string | Error;
}

export class Contract implements ContractInterface {
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

  // @ts-ignore
  static fromId(contractId: string) {
    throw Error("cannot instantiate the base contract with fromId");
  }

  getContractText(): string | Error {
    return this.script;
  }

  getArtifact() {
    const contractText = this.script;
    if (typeof contractText === "string") {
      return CashCompiler.compileString(contractText);
    } else {
      throw contractText;
    }
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

  public async _run(
    wif: string,
    funcName: string,
    outputAddress: string,
    getHexOnly = false,
    utxos?: Utxo[]
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

    const balance = await this.getBalance();

    // If no utxos were provided, automatically get them
    if (typeof utxos === "undefined") {
      utxos = await this.contract.getUtxos();
    }

    if (utxos.length > 0) {
      try {
        const feePerByte = 1;
        // Create an estimate transaction with zero fees, sending nominal balance
        const estimatorInstance = func(0, publicKey, sig)
          .to(outputAddress, 10)
          .from(utxos);
        const estimatedTxHex = (await estimatorInstance
          .withFeePerByte(feePerByte)
          ["build"]()) as string;

        // Use the feePerByte to get the fee for the transaction length
        const fee = Math.round(estimatedTxHex.length * 2 * feePerByte);
        let funcInstance = func(fee, publicKey, sig)
          .to(outputAddress, balance - fee)
          .from(utxos);
        let tx = await funcInstance.withHardcodedFee(fee)[method]();

        if (getHexOnly) {
          return { tx: tx.txid, fee: fee, utxo: utxos };
        } else {
          return tx;
        }
      } catch (e) {
        throw Error(e);
      }
    } else {
      throw Error("There were no UTXOs provided or available on the contract");
    }
  }
}
