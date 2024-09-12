import { CONST, Mainnet, Network, UtxoI, fromUtxoId } from "mainnet-js";

import {
  EscrowArguments,
  EscrowContractResponseI,
  EscrowInfoResponseI,
} from "./interface.js";

import { Contract } from "../Contract.js";
import { SignatureTemplate } from "cashscript";
import { toCashScript } from "../WrappedProvider.js";

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
    const addressArgs = [sellerAddr, buyerAddr, arbiterAddr];

    // Derive the network from addresses given or throw error if not on same network
    const network = Mainnet.derivedNetwork(
      Object.values(addressArgs)
    ) as Network;
    const tmpNonce = nonce ? nonce : Mainnet.getWeakRandomInt(2147483647);
    // Transform the arguments given to Public Key Hashes
    const rawContractArgs = addressArgs.map((x) => {
      return Mainnet.derivePublicKeyHash(x);
    }) as any[];
    rawContractArgs.push(amount);
    rawContractArgs.push(tmpNonce);
    super(EscrowContract.getContractText(), rawContractArgs, network, tmpNonce);

    // Assure all addresses are prefixed and lowercase
    [this.sellerAddr, this.buyerAddr, this.arbiterAddr] = addressArgs.map((x) =>
      Mainnet.sanitizeAddress(x)
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
   * @param wif Private key of the const signing the transaction
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
    ].join(CONST.DELIMITER);
  }

  /**
   * getSerializedArguments - Serialize the constructor arguments of an escrow contract
   *
   * a low-level function
   *
   * @returns A list of serialized arguments
   */
  private getSerializedArguments() {
    const args = [
      this.sellerAddr,
      this.buyerAddr,
      this.arbiterAddr,
      this.amount,
    ];
    return Mainnet.btoa(
      args.map((a) => Mainnet.btoa(a.toString())).join(CONST.DELIMITER)
    );
  }

  /**
   * fromId - Deserialize a contract from a string
   *
   * an intermediate function
   *
   * @returns A new escrow contract
   */
  public static fromId(escrowContractId: string) {
    const [
      type,
      network,
      serializedArgs,
      serializedParams,
      serializedScript,
      nonce,
    ] = escrowContractId.split(CONST.DELIMITER);
    const [sellerAddr, buyerAddr, arbiterAddr, amount] = Mainnet.atob(
      serializedArgs
    )
      .split(CONST.DELIMITER)
      .map((s) => Mainnet.atob(s));

    const script = Mainnet.atob(serializedScript);
    const paramStrings = Mainnet.atob(serializedParams)
      .split(CONST.DELIMITER)
      .map((s) => Mainnet.atob(s));
    const contract = new EscrowContract({
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
    const contract = EscrowContract.create(request);
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
    return `
            contract escrow(bytes20 sellerPkh, bytes20 buyerPkh, bytes20 arbiterPkh, int contractAmount, int contractNonce) {

                function spend(pubkey signingPk, sig s, int amount, int nonce) {
                    require(hash160(signingPk) == arbiterPkh || hash160(signingPk) == buyerPkh);
                    require(checkSig(s, signingPk));
                    require(amount >= contractAmount);
                    require(nonce == contractNonce);
                    bytes25 lockingCode = new LockingBytecodeP2PKH(sellerPkh);
                    bool sendsToSeller = tx.outputs[0].lockingBytecode == lockingCode;
                    require(tx.outputs[0].value == amount);
                    require(sendsToSeller);
                }

                function refund(pubkey signingPk, sig s, int amount, int nonce) {
                    require(hash160(signingPk) == arbiterPkh||hash160(signingPk) == sellerPkh);
                    require(checkSig(s, signingPk));
                    require(amount >= contractAmount);
                    require(nonce == contractNonce);
                    bytes25 lockingCode = new LockingBytecodeP2PKH(buyerPkh);
                    bool sendsToSeller = tx.outputs[0].lockingBytecode == lockingCode;
                    require(tx.outputs[0].value == amount);
                    require(sendsToSeller);
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

  public async _sendMax(
    wif: string,
    funcName: string,
    outputAddress: string,
    getHexOnly = false,
    utxoIds?: string[]
  ) {
    const sig = new SignatureTemplate(wif);
    const publicKey = sig.getPublicKey();
    const func = this.getFunctionByName(funcName);

    // If getHexOnly is true, just return the tx hex, otherwise submit to the network
    const method = getHexOnly ? "build" : "send";

    // If no utxos were provided, automatically get them
    let utxos: UtxoI[];
    if (typeof utxoIds === "undefined") {
      utxos = await this.getUtxos();
    } else {
      utxos = utxoIds.map(fromUtxoId);
    }
    if (utxos.length > 0) {
      try {
        const fee = await this.estimateFee(
          func,
          publicKey,
          sig,
          outputAddress,
          utxos
        );

        const balance = await Mainnet.sumUtxoValue(utxos);

        const amount = balance - fee;
        if (this.amount > amount) {
          throw Error(
            `The contract amount (${this.amount}) could not be submitted for a tx fee (${fee}) with the available with contract balance (${balance})`
          );
        }
        const transaction = func(
          publicKey,
          sig,
          BigInt(amount),
          BigInt(this.getNonce())
        )
          .withHardcodedFee(BigInt(fee))
          .from(utxos.map(toCashScript))
          .to(outputAddress, BigInt(amount));
        const txResult = await transaction[method]();

        if (getHexOnly) {
          return { hex: txResult };
        } else {
          return txResult;
        }
      } catch (e: any) {
        throw Error(e);
      }
    } else {
      throw Error("There were no UTXOs provided or available on the contract");
    }
  }
}
