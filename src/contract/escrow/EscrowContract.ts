import { Contract } from "../Contract";
import { amountInSatoshi } from "../../util/amountInSatoshi";
import { derivedNetwork } from "../../util/deriveNetwork";
import { derivePublicKeyHash } from "../../util/derivePublicKeyHash";
import { sanitizeAddress } from "../../util/sanitizeAddress";
import { Utxo } from "../../interface";

interface ContractArguments {
  sellerAddr: string;
  buyerAddr: string;
  arbiterAddr: string;
  amount: number;
  nonce?: number;
}

export class EscrowContract extends Contract {
  private sellerAddr: string;
  private arbiterAddr: string;
  private buyerAddr: string;
  private amount: number;
  private nonce: number;

  constructor({
    sellerAddr,
    buyerAddr,
    arbiterAddr,
    amount,
    nonce,
  }: ContractArguments) {
    // Put the arguments in contract order
    let addressArgs = [sellerAddr, buyerAddr, arbiterAddr];

    // Derive the network from addresses given or throw error if not on same network
    const network = derivedNetwork(Object.values(addressArgs));
    const tmpNonce = nonce ? nonce : 0;
    // Transform the arguments given to Public Key Hashes
    let rawContractArgs = addressArgs.map((x) => {
      return derivePublicKeyHash(x);
    }) as any[];
    rawContractArgs.push(amount);
    rawContractArgs.push(tmpNonce);
    super(EscrowContract.getContractText(), rawContractArgs, network);

    // Assure all addresses are prefixed and lowercase
    [this.sellerAddr, this.buyerAddr, this.arbiterAddr] = addressArgs.map((x) =>
      sanitizeAddress(x)
    );
    this.nonce = tmpNonce;
    this.amount = amount;
  }

  // Static convenience constructor
  static create({
    sellerAddr,
    buyerAddr,
    arbiterAddr,
    amount,
    nonce,
  }: ContractArguments) {
    return new this({ sellerAddr, buyerAddr, arbiterAddr, amount, nonce });
  }

  // Serialize the contract
  public toString() {
    return (
      `escrow:` +
      `${this.sellerAddr}:` +
      `${this.buyerAddr}:` +
      `${this.arbiterAddr}:` +
      `${this.amount}:` +
      `${this.nonce}:` +
      `${encodeURIComponent(JSON.stringify(this.getArtifact()))}`
    );
  }

  // Deserialize from a string
  public static fromId(contractId: string) {
    let parsedArgs = contractId.split(":");
    if (parsedArgs.shift() !== "escrow") {
      throw Error(
        "attempted to pass non escrow contract id to an escrow contract"
      );
    }

    // Filter off the prefixes in this case since they are serialized with colons
    parsedArgs = parsedArgs.filter(
      (word) => !["bitcoincash", "bchtest", "bchreg"].includes(word)
    );
    let args: ContractArguments = {
      sellerAddr: parsedArgs.shift()!,
      buyerAddr: parsedArgs.shift()!,
      arbiterAddr: parsedArgs.shift()!,
      amount: parseInt(parsedArgs.shift()!),
    };
    if (parsedArgs.length > 0) {
      args["nonce"] = parseInt(parsedArgs.shift()!);
    }
    return EscrowContract.create(args);
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
    return await this._spendMax(
      wif,
      funcName,
      outputAddress,
      getHexOnly,
      utxos,
      this.nonce
    );
  }

  static getContractText() {
    return `
            pragma cashscript ^0.5.3;
            contract EscrowContract(bytes20 sellerPkh, bytes20 buyerPkh, bytes20 arbiterPkh, int contractAmount, int contractNonce) {

                function spend(pubkey signingPk, sig s, int amount, int nonce) {
                    require(hash160(signingPk) == arbiterPkh || hash160(signingPk) == buyerPkh);
                    require(checkSig(s, signingPk));
                    require(amount >= contractAmount);
                    require(nonce == contractNonce);
                    bytes34 output = new OutputP2PKH(bytes8(amount), sellerPkh);
                    require(hash256(output) == tx.hashOutputs);
                }

                function refund(pubkey signingPk, sig s, int amount, int nonce) {
                    require(hash160(signingPk) == arbiterPkh||hash160(signingPk) == sellerPkh);
                    require(checkSig(s, signingPk));
                    require(amount >= contractAmount);
                    require(nonce == contractNonce);
                    bytes34 output = new OutputP2PKH(bytes8(amount), buyerPkh);
                    require(hash256(output) == tx.hashOutputs);
                }
            }
        `;
  }
}
