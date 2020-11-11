import { Artifact, CashCompiler, Contract as CSContract } from "cashscript";
import { NetworkEnum } from "../enum";

import { default as ElectrumNetworkProvider } from "../network/ElectrumNetworkProvider";

export default interface ContractInterface {
  /**
   * toString should retrun a serialized representation of the contract
   * @returns returns a serialized representation of the contract
   */
  toString(): string;
}

export class Contract implements ContractInterface {
  private script: string;
  private parameters: Object;
  private artifact?: Artifact;
  private contract?: CSContract;
  private provider?: ElectrumNetworkProvider;
  public network: string;

  constructor(script: string, parameters: any, network: string) {
    this.script = script;
    this.parameters = parameters;
    this.network = network ? network : "mainnet";
  }

  static fromId({ contractId }: { contractId: string }) {
    contractId;
    throw Error("cannot instantiate the base contract with fromId");
  }

  public fromCashScript() {
    this.artifact = CashCompiler.compileFile(this.script);
    this.contract = new CSContract(this.artifact, [], this.provider);
    return this;
  }

  public static fromCashScript(script, parameters, network?) {
    return new this(script, parameters, network).fromCashScript();
  }

  public call(method: string, args) {
    this.contract!.functions[method](args);
  }
}
