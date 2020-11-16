import { Contract } from "../Contract";
import { derivedNetwork } from "../../util/deriveNetwork";
import { derivePublicKeyHash } from "../../util/derivePublicKeyHash";
import { sanitizeAddress } from "../../util/sanitizeAddress";
import { Utxo } from "../../interface";

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
    this.buyerAddr = sanitizeAddress(buyerAddr);
    this.arbiterAddr = sanitizeAddress(arbiterAddr);
    this.sellerAddr = sanitizeAddress(sellerAddr);
    this.network = network;
    this.parameters = [
      this.arbiterPKH,
      this.buyerPKH,
      this.sellerPKH,
    ];
  }

  // Static convenience constructor
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


  // Serialize the contract
  public toString() {
    return `escrow:${this.sellerAddr}:${this.buyerAddr}:${this.arbiterAddr}`;
  }

  // Deserialize from a string
  public static fromId(contractId: string) {
    let contractArgs = contractId.split(":");
    if (contractArgs.shift() !== "escrow") {
      throw Error(
        "attempted to pass non escrow contract id to an escrow contract"
      );
    }

    // Filter off the prefixes in this case since they are serialized with colons
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
    let outputAddress
    if (funcName.startsWith("spend")) {
      outputAddress = this.sellerAddr
    } else if (funcName.startsWith("refund")) {
      outputAddress = this.buyerAddr
    } else {
      throw Error("Could not determine output address")
    }
    return await this._run(
        wif,
        funcName,
        outputAddress,
        getHexOnly,
        utxos
      )
    
  }

  static getContractText() {
    return `
            pragma cashscript ^0.5.3;
            contract EscrowContract(bytes20 arbiterPkh, bytes20 buyerPkh, bytes20 sellerPkh) {

                function spend(int fee, pubkey signingPk, sig s) {
                    require(hash160(signingPk) == arbiterPkh || hash160(signingPk) == buyerPkh);
                    require(checkSig(s, signingPk));
                    
                    int amount1 = int(bytes(tx.value)) - fee;
                    bytes34 out1 = new OutputP2PKH(bytes8(amount1), sellerPkh);
                    require(hash256(out1) == tx.hashOutputs);
                }

                function refund(int fee, pubkey signingPk, sig s) {
                    require(hash160(signingPk) == arbiterPkh||hash160(signingPk) == sellerPkh);
                    require(checkSig(s, signingPk));
                    
                    int amount1 = int(bytes(tx.value)) - fee;
                    bytes34 out1 = new OutputP2PKH(bytes8(amount1), buyerPkh);
                    require(hash256(out1) == tx.hashOutputs);
                }
            }
        `;
  }
}
