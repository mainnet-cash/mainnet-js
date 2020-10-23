// Unstable?
import {
  CashAddressNetworkPrefix
} from "@bitauth/libauth";

import { getStorageProvider } from "../db/util";
import { NetworkEnum, WalletTypeEnum } from "./enum";
import { RegTestWallet, TestNetWallet, Wallet, WifWallet } from "./Wif";

interface WalletRequest {
  name?: string;
  network?: string;
  type?: WalletTypeEnum;
}

interface WalletResponse {
  name: string;
  cashaddr: string;
  walletId: string;
  network?: NetworkEnum;
}


var networkMap = {
  "mainnet": "bitcoincash",
  "testnet": "bchtest",
  "regtest": "bchreg"
}

var networkPrefixMap = {
  "bitcoincash":"mainnet",
  "bchtest":"testnet",
  "bchreg":"regtest"
}

function asJsonResponse(wallet: WifWallet): WalletResponse {
  return {
    name: wallet.name,
    cashaddr: wallet.cashaddr as string,
    walletId: wallet.getSerializedWallet(),
    network: wallet.network,
  };
}

export async function createWallet(body: WalletRequest): Promise<WifWallet> {
  let wallet;

  switch (body.network) {
    case "regtest":
      wallet = new RegTestWallet(body.name);
      break;
    case "testnet":
      wallet = new TestNetWallet(body.name);
      break;
    case "mainnet":
      wallet = new Wallet(body.name);
      break;
    default:
      wallet = new Wallet(body.name);
  }
  if (wallet) {
    switch (body.type) {
      case WalletTypeEnum.Wif:
        await wallet.generateWif();
        break;
      case WalletTypeEnum.Hd:
        throw Error("Not Implemented");
      default:
        await wallet.generateWif();
    }
    return wallet;
  } else {
    throw Error("Error creating wallet");
  }
}

/**
 * Create a new wallet
 * @param walletRequest A wallet request object
 * @returns A new wallet object
 */
export async function createWalletResponse(
  walletRequest: WalletRequest
): Promise<WalletResponse> {
  let wallet = await createWallet(walletRequest);
  if (wallet) {
    return asJsonResponse(wallet);
  } else {
    throw Error("Error creating wallet");
  }
}

export async function walletFromId(
  walletId: string
): Promise<Wallet | TestNetWallet | RegTestWallet> {
  let [walletType, network, privateImport]: string[] = walletId.split(":");

  let walletRequest = {
    name: "",
    network: network,
    type: WalletTypeEnum[walletType],
  } as WalletRequest;
  let wallet = await createWallet(walletRequest);
  switch (walletType) {
    case "wif":
      await wallet.initializeWIF(privateImport);
      break;
    case "hd":
      throw Error("Heuristic Wallets are not implemented");
    default:
      throw Error(`The wallet type: ${walletType} was not understood`);
  }
  return wallet;
}


export const named = async (
  name: string,
  networkPrefix=CashAddressNetworkPrefix.mainnet,
  dbName: string,
  forceNew=false
): Promise<Wallet | TestNetWallet | RegTestWallet> => {
  
  if(name.length===0){
    throw Error("Named wallets must have a non-empty name")
  }
  dbName = dbName ? dbName: networkPrefix  as string
  let db = getStorageProvider(dbName);
  await db.init();
  let savedWallet = await db.getWallet(name);
  if (savedWallet) {
    if(forceNew){
      throw Error(`A wallet with the name ${name} already exists in ${dbName}`)
    }
    await db.close();
    return fromId(name, savedWallet.wallet, networkPrefix);
  } else {
    let wallet = await initWallet(name, networkPrefix)
    let created = await db.addWallet(wallet.name, wallet.getSerializedWallet());
    if (!created) {
      console.warn(`Retrieving  ${name} from ${dbName}`);
    }
    await db.close();
    return wallet;
  }
  
};


export const newRandom = async (name:string, network=CashAddressNetworkPrefix.mainnet, dbName: string): Promise<Wallet | TestNetWallet | RegTestWallet> => {
  if(name.length>0){
    return await named(name, network, dbName, true)
  }else{
    return await initWallet(name, network)
  }
};


export const fromId = async (name='', walletId: string, networkPrefix=CashAddressNetworkPrefix.mainnet):Promise<Wallet | TestNetWallet | RegTestWallet> => {
  let [walletType, networkGiven, privateImport]: string[] = walletId.split(":");
  if (walletType != "wif") {
    throw Error(`Wallet type ${walletType} was passed to wif wallet`);
  }
  if (networkPrefixMap[networkPrefix] != networkGiven) {
    throw Error(`Network prefix ${networkGiven} to a ${networkPrefixMap[networkPrefix]} wallet`);
  }
  return fromWif(name, privateImport, networkPrefix);
};

export const fromWif = async (
  name='',
  walletImportFormatString: string,
  networkPrefix: CashAddressNetworkPrefix
) => {
  let w = new WifWallet(name, networkPrefix);
  await w.initializeWIF(walletImportFormatString);
  return w;
};

export const watchOnly = async (
  name:string,
  walletImportFormatString: string,
  networkPrefix: CashAddressNetworkPrefix
) => {
  let w = new WifWallet(name, networkPrefix);
  await w.initializeWatchOnly(walletImportFormatString);
  return w;
};

const initWallet = async(
  name:string,
  networkPrefix: CashAddressNetworkPrefix
) => {
  let w = new WifWallet(name, networkPrefix);
  await w.generateWif();
  return w
}