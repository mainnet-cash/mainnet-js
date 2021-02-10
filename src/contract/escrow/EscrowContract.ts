import { Contract } from "../Contract";
import { derivedNetwork } from "../../util/deriveNetwork";
import { derivePublicKeyHash } from "../../util/derivePublicKeyHash";
import { sanitizeAddress } from "../../util/sanitizeAddress";
import { UtxoI } from "../../interface";
import { EscrowArguments } from "./interface";
import { getRandomInt } from "../../util/randomInt";

export class EscrowContract extends Contract {
  private sellerAddr: string;
  private buyerAddr: string;

  // @ts-ignore
  private arbiterAddr: string;
  // @ts-ignore
  private amount: number;

  constructor({
    sellerAddr,
    buyerAddr,
    arbiterAddr,
    amount,
    nonce,
  }: EscrowArguments) {
    // Put the arguments in contract order
    let addressArgs = [sellerAddr, buyerAddr, arbiterAddr];

    // Derive the network from addresses given or throw error if not on same network
    const network = derivedNetwork(Object.values(addressArgs));
    const tmpNonce = nonce ? nonce : getRandomInt(2147483647);
    // Transform the arguments given to Public Key Hashes
    let rawContractArgs = addressArgs.map((x) => {
      return derivePublicKeyHash(x);
    }) as any[];
    rawContractArgs.push(amount);
    rawContractArgs.push(tmpNonce);
    super(EscrowContract.getContractText(), rawContractArgs, network, tmpNonce);

    // Assure all addresses are prefixed and lowercase
    [this.sellerAddr, this.buyerAddr, this.arbiterAddr] = addressArgs.map((x) =>
      sanitizeAddress(x)
    );
    this.amount = amount;
  }

  // Static convenience constructor
  static create({
    sellerAddr,
    buyerAddr,
    arbiterAddr,
    amount,
    nonce,
  }: EscrowArguments) {
    return new this({ sellerAddr, buyerAddr, arbiterAddr, amount, nonce });
  }

  public async run(
    wif: string,
    funcName: string,
    outputAddress?: string,
    getHexOnly = false,
    utxoIds?: string[]
  ) {
    if (!outputAddress) {
      if (funcName === "spend") {
        outputAddress = this.sellerAddr;
      } else if (funcName === "refund") {
        outputAddress = this.buyerAddr;
      } else {
        throw Error("Could not determine output address");
      }
    }
    return await this._sendMax(wif, funcName, outputAddress, getHexOnly, utxoIds);
  }

  static getContractText() {
    return `pragma cashscript ^0.5.3;
            contract escrow(bytes20 sellerPkh, bytes20 buyerPkh, bytes20 arbiterPkh, int contractAmount, int contractNonce) {

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
