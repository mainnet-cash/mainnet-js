import {Contract, Sig, TxOptions} from "cashscript";
import { createWalletFromCashaddr } from "../../wallet/createWallet"
import { BaseWallet } from "../../wallet/Base"

export class EscrowContract {

    private buyer: BaseWallet;
    private arbiter: BaseWallet;
    private seller: BaseWallet;
​
    constructor({sellerCashaddr, buyerCashaddr, arbiterCashaddr}:{sellerCashaddr: string, buyerCashaddr: string, arbiterCashaddr: string}) {
        
        this.buyer = createWalletFromCashaddr(buyerCashaddr)
        this.arbiter = createWalletFromCashaddr(arbiterCashaddr)
        this.seller = createWalletFromCashaddr(sellerCashaddr)
    }
​
    public getAddress() {
        const instance = this.getContactInstance();
        return instance.address;
    }
​
    public async run(wif: string, funcName: string, getHexOnly = false, utxo_txid = null) {
        //const bitbox = new BITBOX();
        const instance = this.getContactInstance();
​
        let fee = 700;
​
        const arbiterEcPair = bitbox.ECPair.fromWIF(wif);
        const s = new Sig(arbiterEcPair);
​
        let func;
        let toCashAddr;
        if(funcName == 'donate') {
            func = instance.functions.donate;
            toCashAddr = this.seller.cashaddr;
        } else if(funcName == 'refund') {
            func = instance.functions.refund;
            toCashAddr = this.buyer.cashaddr;
        } else {
            throw new Error(`function ${funcName} is not defined`);
        }
​
        const method = getHexOnly ? 'getTxHex' : 'send';
​
        let funcInstance = func(this.nonce, fee, bitbox.ECPair.toPublicKey(arbiterEcPair), s);
        const utxo = await funcInstance.getFirstUtxo(utxo_txid);
        if(utxo) {
            const options = {utxos: [utxo]} as TxOptions;
            try {
                const tx: any = await funcInstance[method]([{to: toCashAddr, amount: utxo.satoshis}], options); // should work
            } catch (e) {
                let fee;
                const matcher = /Insufficient balance: available \((\d+)\) < needed \((\d+)\)./;
                if (e.message.match(matcher)) {
                    const [, available, needed] = e.message.match(matcher);
                    fee = needed - available;
                    // console.log(`Will send ${utxo.satoshis} sats, with ${fee} sats fee`);
​
                    funcInstance = func(this.nonce, fee, bitbox.ECPair.toPublicKey(arbiterEcPair), s);
                    const tx: any = await funcInstance[method]([{to: toCashAddr, amount: utxo.satoshis - fee}], options); // should work
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
        const FundingContract: Contract = Contract.compile(contractText, 'mainnet');
        return FundingContract.new(this.seller.publicKeyHash, this.buyer.publicKeyHash, this.arbiter.publicKeyHash);
    }
​
    private getContractText() {
        return `
            pragma cashscript ^0.3.1;
​
            contract FundingContract(bytes20 sellerPkh, bytes20 buyerPkh, bytes20 arbiterPkh, string nonce) {
                function donate(int fee, pubkey arbiterPk, sig s) {
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