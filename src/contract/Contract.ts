import {
  Artifact,
  CashCompiler,
  Contract as CSContract,
  ElectrumNetworkProvider,
} from "cashscript";
import {
  instantiateRipemd160,
  instantiateSha256,
  Ripemd160,
  Sha256,
} from "@bitauth/libauth";
import { Network } from "../interface";

export class Contract {
  private script: string;
  private parameters: Object;
  private artifact?: Artifact;
  private contract?: CSContract;
  private provider?: ElectrumNetworkProvider;
  private network: string;

  constructor(script: string, parameters: any, network?: string) {
    this.script = script;
    this.parameters = parameters;
    this.network = network ? network : "mainnet";
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
