import {
  Contract as CashscriptContract,
  SignatureTemplate,
  CashCompiler,
  Argument,
} from "cashscript";
import { instantiateSecp256k1 } from "@bitauth/libauth";
import { derivePublicKeyHash } from "../../util/derivePublicKeyHash";
import { Contract } from "../Contract";
import { Utxo } from "../../interface";
import { Network } from "../../interface";
import { derivedNetwork } from "../util";

import { getNetworkProvider } from "../../network/default";

export class EscrowContract extends Contract {
  private buyerPKH: Uint8Array;
  private arbiterPKH: Uint8Array;
  private sellerPKH: Uint8Array;
  private buyerAddr: string;
  private arbiterAddr: string;
  private sellerAddr: string;

  constructor({
    sellerAddr,
    buyerAddr,
    arbiterAddr,
  }: {
    sellerAddr: string;
    buyerAddr: string;
    arbiterAddr: string;
  }) {
    let args = {
      sellerAddr,
      buyerAddr,
      arbiterAddr,
    };
    const network = derivedNetwork(Object.values(args));
    super(EscrowContract.getContractText(), args, network);
    this.buyerPKH = derivePublicKeyHash(buyerAddr);
    this.arbiterPKH = derivePublicKeyHash(arbiterAddr);
    this.sellerPKH = derivePublicKeyHash(sellerAddr);
    this.buyerAddr = buyerAddr;
    this.arbiterAddr = arbiterAddr;
    this.sellerAddr = sellerAddr;
    this.network = network;
  }

  static create({
    sellerAddr,
    buyerAddr,
    arbiterAddr,
  }: {
    sellerAddr: string;
    buyerAddr: string;
    arbiterAddr: string;
  }) {
    return new this({ sellerAddr, buyerAddr, arbiterAddr });
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

  public toString() {
    return `escrow:${this.sellerAddr}:${this.buyerAddr}:${this.arbiterAddr}`;
  }

  public static fromId({ contractId }: { contractId: string }) {
    let contractArgs = contractId.split(":");
    if (contractArgs.shift() !== "escrow") {
      throw Error(
        "attempted to pass non escrow contract id to an escrow contract"
      );
    }
    contractArgs = contractArgs.filter(
      (word) => !["bitcoincash", "bchtest", "bchreg"].includes(word)
    );
    return EscrowContract.create({
      sellerAddr: contractArgs.shift()!,
      buyerAddr: contractArgs.shift()!,
      arbiterAddr: contractArgs.shift()!,
    });
  }

  public async run(
    wif: string,
    funcName: string,
    getHexOnly = false,
    utxos?: Utxo[]
  ) {
    const instance = this.getContactInstance();
    let fee = 1200;

    const sig = new SignatureTemplate(wif);

    const secp256k1 = await instantiateSecp256k1();
    let publicKey = sig.getPublicKey(secp256k1);

    let func;
    if (typeof instance.functions[funcName] === "function") {
      func = instance.functions[funcName];
    } else {
      throw Error(`${funcName} is not a contract method`);
    }

    let address;
    if (funcName.startsWith("spend")) {
      address = this.sellerAddr;
    } else if (funcName.startsWith("refund")) {
      address = this.buyerAddr;
    }

    const method = getHexOnly ? "getTxHex" : "send";

    const balance = await instance.getBalance();

    if (typeof utxos === "undefined") {
      utxos = await instance.getUtxos();
    }

    if (utxos.length > 0) {
      try {
        let funcInstance = func(fee, publicKey, sig)
          .to(address, balance - fee)
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
            .to(address, balance - fee)
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

  private getArtifact() {
    const contractText = EscrowContract.getContractText();
    return CashCompiler.compileString(contractText);
  }

  private getContactInstance() {
    let artifact = this.getArtifact();

    const parameters: Argument[] = [
      this.arbiterPKH,
      this.buyerPKH,
      this.sellerPKH,
    ];
    const provider = getNetworkProvider(this.network);

    return new CashscriptContract(artifact, parameters, provider);
  }

  private static getContractText() {
    return `
            pragma cashscript ^0.5.3;
            contract EscrowContract(bytes20 arbiterPkh, bytes20 buyerPkh, bytes20 sellerPkh) {

                function spendByArbiter(int fee, pubkey signingPk, sig s) {
                    require(hash160(signingPk) == arbiterPkh);
                    require(checkSig(s, signingPk));
                    
                    int amount1 = int(bytes(tx.value)) - fee;
                    bytes34 out1 = new OutputP2PKH(bytes8(amount1), sellerPkh);
                    require(hash256(out1) == tx.hashOutputs);
                }
                
                function refundByArbiter(int fee, pubkey signingPk, sig s) {
                    require(hash160(signingPk) == arbiterPkh);
                    require(checkSig(s, signingPk));
                    
                    int amount1 = int(bytes(tx.value)) - fee;
                    bytes34 out1 = new OutputP2PKH(bytes8(amount1), buyerPkh);
                    require(hash256(out1) == tx.hashOutputs);
                }

                function spendByBuyer(int fee, pubkey signingPk, sig s) {
                    require(hash160(signingPk) == buyerPkh);
                    require(checkSig(s, signingPk));
                    
                    int amount1 = int(bytes(tx.value)) - fee;
                    bytes34 out1 = new OutputP2PKH(bytes8(amount1), sellerPkh);
                    require(hash256(out1) == tx.hashOutputs);
                }
                
                function refundBySeller(int fee, pubkey signingPk, sig s) {
                    require(hash160(signingPk) == sellerPkh);
                    require(checkSig(s, signingPk));
                    
                    int amount1 = int(bytes(tx.value)) - fee;
                    bytes34 out1 = new OutputP2PKH(bytes8(amount1), buyerPkh);
                    require(hash256(out1) == tx.hashOutputs);
                }
                                
            }
        `;
  }
}
