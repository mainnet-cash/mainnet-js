// // Unstable?
// import { CashAddressNetworkPrefix } from "@bitauth/libauth";

// import { getStorageProvider } from "../db/util";
import { NetworkEnum, WalletTypeEnum } from "./enum";
import { WatchWallet, TestNetWatchWallet, RegTestWatchWallet } from "./Watch";
import { WifWallet, TestNetWifWallet, RegTestWifWallet } from "./Wif";

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
  mainnet: "bitcoincash",
  testnet: "bchtest",
  regtest: "bchreg",
};

var walletClassMap = {
  wif: {
    mainnet: () => {
      return WifWallet;
    },
    testnet: () => {
      return TestNetWifWallet;
    },
    regtest: () => {
      return RegTestWifWallet;
    },
  },
  watch: {
    mainnet: () => {
      return WatchWallet;
    },
    testnet: () => {
      return TestNetWatchWallet;
    },
    regtest: () => {
      return RegTestWatchWallet;
    },
  },
};

export const networkPrefixMap = {
  bitcoincash: "mainnet",
  bchtest: "testnet",
  bchreg: "regtest",
};

export async function createWallet(body: WalletRequest): Promise<any> {
  let wallet;
  let walletType = body.type ? body.type : "wif";
  let networkType = body.network ? body.network : "mainnet";

  // Named wallets are saved in the database
  if (body.name && body.name.length>0) {
    wallet = await walletClassMap[walletType][networkType]().named(body.name);
    if (wallet.network != networkType) {
      throw Error(
        `A wallet already exists with name ${body.name}, but with network ${wallet.network} not ${body.network}, per request`
      );
    }
    if (wallet.walletType != walletType) {
      throw Error(
        `A wallet already exists with name ${body.name}, but with type ${wallet.walletType} not ${body.type}, per request`
      );
    }
    return wallet;
  }
  // This handles unsaved/unnamed wallets
  else {
    let walletClass = walletClassMap[walletType][networkType]();
    wallet = await new walletClass()
    return wallet.generate()
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

function asJsonResponse(wallet: WifWallet): WalletResponse {
  return {
    name: wallet.name,
    cashaddr: wallet.cashaddr as string,
    walletId: wallet.toString(),
    network: wallet.network,
  };
}

export async function walletFromId(walletId: string): Promise<any> {
  let [walletType, network, walletData]: string[] = walletId.split(":");

  let walletRequest = {
    name: "",
    network: network,
    type: WalletTypeEnum[walletType],
  } as WalletRequest;
  let wallet = await createWallet(walletRequest);
  await wallet.initialize(walletData);
  return wallet;
}