import { instantiateSecp256k1 } from "@bitauth/libauth";
import { Argument, Artifact, CashCompiler, Contract as CashScriptContract, SignatureTemplate } from "cashscript";
import { default as ElectrumNetworkProvider } from "../network/ElectrumNetworkProvider";
import { getNetworkProvider } from "../network/default";
import { Utxo } from "../interface";

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
  getContractText(): string|Error ;

}

export class Contract implements ContractInterface {
  private script: string;
  public parameters: Argument[];
  private artifact?: Artifact;
  private contract?: CashScriptContract;
  private provider?: ElectrumNetworkProvider;
  public network: string;
  private address?: string;

  constructor(script: string, parameters: any, network: string) {
    this.script = script;
    this.parameters = parameters;
    this.network = network ? network : "mainnet";
  }

  // @ts-ignore
  static fromId(contractId: string) {
    throw Error("cannot instantiate the base contract with fromId");
  }

  
  getContractText():string|Error {
    return this.script
  }

  getArtifact() {
      const contractText = this.getContractText();
      if(typeof contractText === "string"){
        return CashCompiler.compileString(contractText);  
      }else{
        throw contractText
      }
    }  

  public getAddress() {
    const instance = this.getContactInstance();
    return instance.address;
  }

  public getUtxos() {
    const instance = this.getContactInstance();
    return instance.getUtxos();
  }

  public getBalance() {
    const instance = this.getContactInstance();
    return instance.getBalance();
  }

  private getContactInstance() {
    let artifact = this.getArtifact();
    const provider = getNetworkProvider(this.network);
    return new CashScriptContract(artifact, this.parameters, provider);
  }

  public fromCashScript() {
    this.artifact = CashCompiler.compileFile(this.script);
    this.contract = new CashScriptContract(this.artifact, [], this.provider);
    return this;
  }

  public static fromCashScript(script, parameters, network?) {
    return new this(script, parameters, network).fromCashScript();
  }

  public call(method: string, args) {
    this.contract!.functions[method](args);
  }

  public async _run(
    wif: string,
    funcName: string,
    outputAddress:string,
    getHexOnly = false,
    utxos?: Utxo[]
  ) {
    const instance = this.getContactInstance();
    let fee = 1400;

    const sig = new SignatureTemplate(wif);

    const secp256k1 = await instantiateSecp256k1();
    let publicKey = sig.getPublicKey(secp256k1);

    let func;
    if (typeof instance.functions[funcName] === "function") {
      func = instance.functions[funcName];
    } else {
      throw Error(`${funcName} is not a contract method`);
    }

    // If getHexOnly is true, just return the tx hex, otherwise submit to the network
    const method = getHexOnly ? "getTxHex" : "send";

    const balance = await this.getBalance();

    // If no utxos were provided, automatically get them
    if (typeof utxos === "undefined") {
      utxos = await instance.getUtxos();
    }

    if (utxos.length > 0) {
      try {
        let funcInstance = func(fee, publicKey, sig)
          .to(outputAddress, balance - fee)
          .from(utxos);
        const tx = await funcInstance.withHardcodedFee(fee)[method]();
        if (getHexOnly) {
          return { tx: tx.txid, fee: fee, utxo: utxos };
        } else {
          return tx;
        }
      } catch (e) {
        const matcher = /Insufficient balance: available \((\d+)\) < needed \((\d+)\)./;
        if (e.message.match(matcher)) {
          const [, available, needed] = e.message.match(matcher);
          fee = needed - available;
          let funcInstance = func(fee, publicKey, sig)
            .to(outputAddress, balance - fee)
            .from(utxos);
          let tx = await funcInstance.withHardcodedFee(fee)[method]();
          if (getHexOnly) {
            return { tx: tx.txid, fee: fee, utxo: utxos };
          } else {
            return tx;
          }
        } else {
          throw Error(e);
        }
      }
    } else {
      throw Error("There were no UTXOs provided or available on the contract");
    }
  }

}
