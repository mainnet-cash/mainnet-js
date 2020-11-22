import { default as NetworkProvider } from "./NetworkProvider";
import { default as StorageProvider } from "../db/StorageProvider";
import { getNetworkProvider } from "./default"
import { Network } from "../interface";
import { Wallet } from "../wallet/Wif"
import { walletClassMap } from "../wallet/createWallet"
import { prefixFromNetworkMap } from "../enum";
import { getStorageProvider } from "../db/util";
import { CashAddressNetworkPrefix, instantiateSecp256k1, instantiateSha256, Secp256k1, Sha256 } from "@bitauth/libauth";

export class Connection {

    public network: Network
    public networkPrefix: CashAddressNetworkPrefix
    public networkProvider: NetworkProvider
    

    constructor(network: Network = Network.MAINNET, useCluster = false) {
        this.network = network
        this.networkPrefix = prefixFromNetworkMap[this.network]
        this.networkProvider = getNetworkProvider(network, useCluster, true)
    }

    public async ready(){
        try{
            await this.networkProvider.connect()
            await this.networkProvider.ready()    
        }catch (e){
            throw Error(e)
        }
    }

    public async disconnect(){
        try{
            await this.networkProvider.disconnect()
        }catch (e){
            throw Error(e)
        }
    }


    public async Wallet(name=""): Promise<Wallet>{
        let walletClass =  walletClassMap['wif'][this.network]()
        let wallet = new walletClass(name)
        let walletResult = await wallet.generate()
        if(walletResult instanceof Error){
            throw walletResult
        }else{
            walletResult.provider = this.networkProvider
            return walletResult
        }
    }
} 