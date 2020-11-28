import { Contract } from "../Contract";
import { derivedNetwork } from "../../util/deriveNetwork";
import { derivePublicKeyHash } from "../../util/derivePublicKeyHash";
import { sanitizeAddress } from "../../util/sanitizeAddress";
import { Utxo } from "../../interface";

export class EscrowContract extends Contract {
  private sellerAddr: string;
  private arbiterAddr: string;
  private buyerAddr: string;

  constructor({
    sellerAddr,
    buyerAddr,
    arbiterAddr,
  }: {
    sellerAddr: string;
    buyerAddr: string;
    arbiterAddr: string;
  }) {
    // Put the arguments in contract order
    let args = [sellerAddr, buyerAddr, arbiterAddr];

    // Derive the network from addresses given or throw error if not on same network
    const network = derivedNetwork(Object.values(args));

    // Transform the arguments given to Public Key Hashes
    let rawContractArgs = args.map((x) => derivePublicKeyHash(x));

    super(EscrowContract.getContractText(), rawContractArgs, network);

    // Assure all addresses are prefixed and lowercase
    [this.sellerAddr, this.buyerAddr, this.arbiterAddr] = args.map((x) =>
      sanitizeAddress(x)
    );
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
    return `escrow:${this.sellerAddr}:${this.buyerAddr}:${this.arbiterAddr}:${encodeURIComponent(JSON.stringify(this.getArtifact()))}`;
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
    let outputAddress;
    if (funcName.startsWith("spend")) {
      outputAddress = this.sellerAddr;
    } else if (funcName.startsWith("refund")) {
      outputAddress = this.buyerAddr;
    } else {
      throw Error("Could not determine output address");
    }
    return await this._run(wif, funcName, outputAddress, getHexOnly, utxos);
  }

  static getContractText() {
    return `
            pragma cashscript ^0.5.3;
            contract EscrowContract(bytes20 sellerPkh, bytes20 buyerPkh, bytes20 arbiterPkh) {

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
