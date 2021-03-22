import { Contract } from "../Contract";
import { derivedNetwork } from "../../util/deriveNetwork";
import { derivePublicKeyHash } from "../../util/derivePublicKeyHash";
import { sanitizeAddress } from "../../util/sanitizeAddress";
import { EscrowArguments } from "./interface";
import { getRandomInt } from "../../util/randomInt";

export class EscrowContract extends Contract {
  private sellerAddr: string;
  private buyerAddr: string;

  // @ts-ignore
  private arbiterAddr: string;
  // @ts-ignore
  private amount: number;

  /**
   *
   * @param sellerAddr Party receiving of funds
   * @param buyerAddr Party sending of funds
   * @param arbiterAddr Third party mediating the contract
   * @param amount Contract amount in satoshi
   * @param nonce A unique number to differentiate the contract
   *
   * @returns A new contract
   */
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

  /**
   * create - Static convenience method for the constructor
   *
   * an intermediate function similar to the constructor, for REST
   *
   * @param sellerAddr Party receiving funds
   * @param buyerAddr Party sending funds
   * @param arbiterAddr Third party mediating the contract disputes
   * @param amount Contract amount required to be paid in satoshi
   * @param nonce A unique number to differentiate the contract
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/contract/escrow/createEscrow|/contract/escrow/create} REST endpoint
   * @returns A new contract
   */
  static create({
    sellerAddr,
    buyerAddr,
    arbiterAddr,
    amount,
    nonce,
  }: EscrowArguments) {
    return new this({ sellerAddr, buyerAddr, arbiterAddr, amount, nonce });
  }

  /**
   * call - Run a method on an escrow contract
   *
   * an high level function
   *
   * @param wif Private key of the wallet signing the transaction
   * @param funcName Escrow function to call
   * @param outputAddress Destination cashaddr
   * @param getHexOnly Boolean to build the transaction without broadcasting
   * @param utxoIds Serialized unspent transaction outputs to spend
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/contract%2Fescrow/createEscrow|/contract/escrow/call} REST endpoint
   * @returns A new contract
   */
  public async call(
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
    return await this._sendMax(
      wif,
      funcName,
      outputAddress,
      getHexOnly,
      utxoIds
    );
  }

  /**
   *
   * @returns The contract text in CashScript
   */
  static getContractText() {
    return `pragma cashscript ^0.6.0;
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
