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
  if (body.name && body.name.length > 0) {
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
    wallet = await new walletClass();
    return wallet.generate();
  }
  return wallet;
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

export const named = async (
  name: string,
  networkPrefix = CashAddressNetworkPrefix.mainnet,
  dbName?: string,
  forceNew = false
): Promise<Wallet | TestNetWallet | RegTestWallet> => {
  if (name.length === 0) {
    throw Error("Named wallets must have a non-empty name");
  }
  dbName = dbName ? dbName : (networkPrefix as string);
  let db = getStorageProvider(dbName);
  await db.init();
  let savedWallet = await db.getWallet(name);
  if (savedWallet) {
    await db.close();
    if (forceNew) {
      throw Error(`A wallet with the name ${name} already exists in ${dbName}`);
    }
    return fromId(savedWallet.wallet, name, networkPrefix);
  } else {
    let wallet = await initWallet(name, networkPrefix);
    let created = await db.addWallet(wallet.name, wallet.getSerializedWallet());
    if (!created) {
      console.warn(`Retrieving  ${name} from ${dbName}`);
    }
    await db.close();
    return wallet;
  }
};

export const newRandom = async (
  name: string,
  dbName: string,
  network = CashAddressNetworkPrefix.mainnet
): Promise<Wallet | TestNetWallet | RegTestWallet> => {
  if (name.length > 0) {
    return await named(name, network, dbName, true);
  } else {
    return await initWallet(name, network);
  }
};

export const fromId = async (
  walletId: string,
  name = "",
  networkPrefix = CashAddressNetworkPrefix.mainnet
): Promise<Wallet | TestNetWallet | RegTestWallet> => {
  let [walletType, networkGiven, privateImport]: string[] = walletId.split(":");
  if (walletType != "wif") {
    throw Error(`Wallet type ${walletType} was passed to wif wallet`);
  }
  if (networkPrefixMap[networkPrefix] != networkGiven) {
    throw Error(
      `Network prefix ${networkGiven} to a ${networkPrefixMap[networkPrefix]} wallet`
    );
  }
  return fromWif(privateImport, name, networkPrefix);
};

export const fromWif = async (
  walletImportFormatString: string,
  name = "",
  networkPrefix: CashAddressNetworkPrefix
) => {
  let w = new WifWallet(name, networkPrefix);
  await w.initializeWIF(walletImportFormatString);
  return w;
};

export const watchOnly = async (
  address: string,
  name = "",
  networkPrefix: CashAddressNetworkPrefix
) => {
  let w = new WifWallet(name, networkPrefix);
  await w.initializeWatchOnly(address);
  return w;
};

const initWallet = async (
  name = "",
  networkPrefix: CashAddressNetworkPrefix
) => {
  let w = new WifWallet(name, networkPrefix);
  await w.generateWif();
  return w;
};
