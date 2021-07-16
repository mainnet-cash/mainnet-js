import { Contract } from "../Contract";
import { derivedNetwork } from "../../util/deriveNetwork";
import { derivePublicKeyHash } from "../../util/derivePublicKeyHash";
import { sanitizeAddress } from "../../util/sanitizeAddress";
import {
  EscrowArguments,
  EscrowContractResponseI,
  EscrowInfoResponseI,
} from "./interface";
import { atob, btoa } from "../../util/base64";
import { getRandomInt } from "../../util/randomInt";
import { Network } from "../..";
import { DELIMITER } from "../../constant";

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
   * toString - Serialize an escrow contract as a string
   *
   * an intermediate function
   *
   * @returns A serialized contract
   */
  public toString() {
    return [
      "escrowContract",
      this.network,
      this.getSerializedArguments(),
      this.getSerializedParameters(),
      this.getSerializedScript(),
      this.getNonce(),
    ].join(DELIMITER);
  }

  /**
   * getSerializedArguments - Serialize the constructor arguments of an escrow contract
   *
   * a low-level function
   *
   * @returns A list of serialized arguments
   */
  private getSerializedArguments() {
    let args = [this.sellerAddr, this.buyerAddr, this.arbiterAddr, this.amount];
    return btoa(args.map((a) => btoa(a.toString())).join(DELIMITER));
  }

  /**
   * fromId - Deserialize a contract from a string
   *
   * an intermediate function
   *
   * @returns A new escrow contract
   */
  public static fromId(escrowContractId: string) {
    let [
      type,
      network,
      serializedArgs,
      serializedParams,
      serializedScript,
      nonce,
    ] = escrowContractId.split(DELIMITER);
    let [sellerAddr, buyerAddr, arbiterAddr, amount] = atob(serializedArgs)
      .split(DELIMITER)
      .map((s) => atob(s));

    let script = atob(serializedScript);
    let paramStrings = atob(serializedParams)
      .split(DELIMITER)
      .map((s) => atob(s));
    let contract = new EscrowContract({
      sellerAddr: sellerAddr,
      buyerAddr: buyerAddr,
      arbiterAddr: arbiterAddr,
      amount: parseInt(amount),
      nonce: parseInt(nonce),
    });
    contract.network = network as Network;
    return contract;
  }

  /**
   * Create a new escrow contract, but respond with a json object
   * @param request A escrow contract request object
   * @returns A new escrow contract object
   */
  public static escrowContractFromJsonRequest(
    request: any
  ): EscrowContractResponseI {
    let contract = EscrowContract.create(request);
    if (contract) {
      return {
        escrowContractId: contract.toString(),
        cashaddr: contract.getDepositAddress(),
      };
    } else {
      throw Error("Error creating contract");
    }
  }

  /**
   *
   * @returns The contract text in CashScript
   */
  static getContractText(): string {
    return `pragma cashscript ^0.6.1;
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

  /**
   * Get information about an escrow contract
   *
   * a high-level function
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/contract/escrow/info} REST endpoint
   * @returns The contract info
   */
  public info(): EscrowInfoResponseI {
    return {
      ...super.info(),
      escrowContractId: this.toString(),
      buyerAddr: this.buyerAddr,
      sellerAddr: this.sellerAddr,
      arbiterAddr: this.arbiterAddr,
      amount: this.amount,
    };
  }
}
