import {WalletType, Network} from "../wallet/Base"
import {Wallet, TestnetWallet, RegTestWallet} from "../wallet/Wif"

export function walletFromIdString(walletId:string){
  
    let walletParam: string[] = walletId.split(":")
    
      let walletType : WalletType.TypeEnum = WalletType[walletParam.shift() || (function(){throw "Error parsing wallet type"}())] ;
      let networkType : Network.NetworkEnum = WalletType[walletParam.shift() || (function(){throw "Error parsing network name"}())] ;
      let privateImport : string = walletParam.shift() || (function(){throw "Error parsing private key"}())
      let wallet: any;
      switch (walletType) {
        case WalletType.TypeEnum.Wif:
          switch(networkType){
            case Network.NetworkEnum.Mainnet:
              wallet = new Wallet();
              wallet.fromWIF(privateImport)
              break;
            case Network.NetworkEnum.Testnet:
              wallet = new TestnetWallet();
              wallet.fromWIF(privateImport)
              break;
            case Network.NetworkEnum.Regtest:
              wallet = new RegTestWallet();
              wallet.fromWIF(privateImport)
              break;
            default:
              throw Error("The network of the wif wallet was not understood.")
          }
          break;
        case WalletType.TypeEnum.Hd:
          throw Error("Heuristic Wallets are not implemented")
        default:
          throw Error("The wallet type was not understood");
      }
      return wallet  
    
  }
