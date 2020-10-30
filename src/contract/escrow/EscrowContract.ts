import { Contract, SignatureTemplate, CashCompiler, 
    ElectrumNetworkProvider,
    Argument, 
} from "cashscript";
import {
    ElectrumCluster,
    ElectrumTransport,
    ClusterOrder,
  } from "electrum-cash";
import { decodeCashAddress } from "@bitauth/libauth"
import { derivePublicKeyHash } from "../../util/derivePublicKeyHash";

export class EscrowContract {

    private buyerPKH: Uint8Array;
    private arbiterPKH: Uint8Array;
    private sellerPKH: Uint8Array;

    constructor({sellerCashaddr, buyerCashaddr, arbiterCashaddr}:{sellerCashaddr: string, buyerCashaddr: string, arbiterCashaddr: string}) {
        
        this.buyerPKH = derivePublicKeyHash(buyerCashaddr)
        this.arbiterPKH = derivePublicKeyHash(arbiterCashaddr)
        this.sellerPKH = derivePublicKeyHash(sellerCashaddr)
    }
​
    public getAddress() {
        const instance = this.getContactInstance();
        return instance.address;
    }
​
    public async run(wif: string, funcName: string, getHexOnly = false, utxo_txid?: string) {
        
        const instance = this.getContactInstance();
        let fee = 700;
        console.log(utxo_txid)

        const sig = new SignatureTemplate(wif);
​
        let func;
        let publicKeyHash;
        if(funcName == 'spend') {
            func = instance.functions.spend;
            publicKeyHash = this.sellerPKH;
        } else if(funcName == 'refund') {
            func = instance.functions.refund;
            publicKeyHash = this.buyerPKH;
        } else {
            throw new Error(`function ${funcName} is not defined`);
        }
​
        const method = getHexOnly ? 'getTxHex' : 'send';
​
        let funcInstance = func(fee, this.arbiterPKH, sig);
        const utxo = ​(await instance.getUtxos()).shift()
        if(utxo) {
            try {
                const tx: any = await funcInstance[method]([{to: publicKeyHash, amount: utxo.satoshis}]).from(utxo); // should work
            } catch (e) {
                let fee;
                const matcher = /Insufficient balance: available \((\d+)\) < needed \((\d+)\)./;
                if (e.message.match(matcher)) {
                    const [, available, needed] = e.message.match(matcher);
                    fee = needed - available;
                    // console.log(`Will send ${utxo.satoshis} sats, with ${fee} sats fee`);
​
                    funcInstance = func(fee, this.arbiterPKH, sig);
                    const tx: any = await funcInstance[method]([{to: publicKeyHash, amount: utxo.satoshis - fee}]).from(utxo); // should work
                    if(!getHexOnly) {
                        return {tx: tx.txid, fee: fee, utxo: utxo};
                    } else {
                        return tx;
                    }
                }
            }
        }
        return {utxo: null};
    }
​
    private getContactInstance() {
        const contractText = this.getContractText();
        const artifact  = CashCompiler.compileString(contractText);
        const parameters: Argument[] = [this.arbiterPKH, this.buyerPKH, this.sellerPKH]
        let cluster = new ElectrumCluster(
            "CashScript Application",
            "1.4.1",
            1,
            1,
            ClusterOrder.RANDOM,
            1020
          );
          cluster.addServer(
            "127.0.0.1",
            60003,
            ElectrumTransport.WS.Scheme,
            false
          );
        const provider = new ElectrumNetworkProvider('testnet', cluster);  
             
        return new Contract(artifact, parameters, provider);
    }
​
    private getContractText() {
        return `
            pragma cashscript ^0.5.3;
            contract FundingContract(bytes20 arbiterPkh, bytes20 buyerPkh, bytes20 sellerPkh) {
                function spend(int fee, pubkey arbiterPk, sig s) {
                    require(int(tx.version) >= 2);
                    require(hash160(arbiterPk) == arbiterPkh);
                    require(checkSig(s, arbiterPk));
                    
                    int amount1 = int(bytes(tx.value)) - fee;
                    bytes34 out1 = new OutputP2PKH(bytes8(amount1), sellerPkh);
                    require(hash256(out1) == tx.hashOutputs);
                }
                
                function refund(int fee, pubkey arbiterPk, sig s) {
                    require(int(tx.version) >= 2);
                    require(hash160(arbiterPk) == arbiterPkh);
                    require(checkSig(s, arbiterPk));
                    
                    int amount1 = int(bytes(tx.value)) - fee;
                    bytes34 out1 = new OutputP2PKH(bytes8(amount1), buyerPkh);
                    require(hash256(out1) == tx.hashOutputs);
                }
                                
            }
        `;
    }
}