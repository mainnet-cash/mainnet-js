import {
  Contract,
  SignatureTemplate,
  CashCompiler,
  ElectrumNetworkProvider,
  Argument,
} from "cashscript";
import {
  ElectrumCluster,
  ElectrumTransport,
  ClusterOrder,
} from "electrum-cash";
import {
  binToHex,
  decodeCashAddress,
  instantiateSecp256k1,
} from "@bitauth/libauth";
import { derivePublicKeyHash } from "../../util/derivePublicKeyHash";

export class EscrowContract {
  private buyerPKH: Uint8Array;
  private arbiterPKH: Uint8Array;
  private sellerPKH: Uint8Array;
  private buyerCashaddr: string;
  private sellerCashaddr: string;

  constructor({
    sellerCashaddr,
    buyerCashaddr,
    arbiterCashaddr,
  }: {
    sellerCashaddr: string;
    buyerCashaddr: string;
    arbiterCashaddr: string;
  }) {
    this.buyerPKH = derivePublicKeyHash(buyerCashaddr);
    this.arbiterPKH = derivePublicKeyHash(arbiterCashaddr);
    this.sellerPKH = derivePublicKeyHash(sellerCashaddr);
    this.buyerCashaddr = buyerCashaddr;
    this.sellerCashaddr = sellerCashaddr;
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

  public async run(wif: string, funcName: string, getHexOnly = false, utxos) {
    const instance = this.getContactInstance();
    let fee = 2000;

    const sig = new SignatureTemplate(wif);

    let func;
    const secp256k1 = await instantiateSecp256k1();
    let publicKey = sig.getPublicKey(secp256k1);

    if (typeof instance.functions[funcName] === "function") {
      func = instance.functions[funcName];
    } else {
      throw Error(`${funcName} is not a contract method`);
    }
    let address;
    if (funcName.startsWith("spend")) {
      address = this.sellerCashaddr;
    } else if (funcName.startsWith("refund")) {
      address = this.buyerCashaddr;
    }

    const method = getHexOnly ? "getTxHex" : "send";
    const spendable = (await instance.getBalance()) - fee;

    if (utxos.length > 0) {
      let funcInstance = func(fee, publicKey, sig)
        .to(address, spendable)
        .from(utxos);
      try {
        const tx: any = await funcInstance.withHardcodedFee(fee)[method]();
      } catch (e) {
        let fee;
        const matcher = /Insufficient balance: available \((\d+)\) < needed \((\d+)\)./;
        if (e.message.match(matcher)) {
          const [, available, needed] = e.message.match(matcher);
          fee = needed - available;
          funcInstance = func(fee, publicKey, sig);
          const tx: any = await funcInstance.withHardcodedFee(fee)[method]();
          if (!getHexOnly) {
            return { tx: tx.txid, fee: fee, utxo: utxos };
          } else {
            return tx;
          }
        } else {
          throw Error(e);
        }
      }
    } else {
      return { utxo: null };
    }
  }

  private getContactInstance() {
    const contractText = this.getContractText();
    const artifact = CashCompiler.compileString(contractText);
    const parameters: Argument[] = [
      this.arbiterPKH,
      this.buyerPKH,
      this.sellerPKH,
    ];
    let cluster = new ElectrumCluster(
      "CashScript Application",
      "1.4.1",
      1,
      1,
      ClusterOrder.RANDOM,
      1020
    );
    cluster.addServer("127.0.0.1", 60003, ElectrumTransport.WS.Scheme, false);
    const provider = new ElectrumNetworkProvider("testnet", cluster);

    return new Contract(artifact, parameters, provider);
  }

  private getContractText() {
    return `
            pragma cashscript ^0.5.3;
            contract FundingContract(bytes20 arbiterPkh, bytes20 buyerPkh, bytes20 sellerPkh) {

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
