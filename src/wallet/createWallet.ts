import { WalletTypeEnum } from "./enum";
import {
  Wallet,
  TestNetWallet,
  RegTestWallet,
  WifWallet,
  TestNetWifWallet,
  RegTestWifWallet,
  WatchWallet,
  TestNetWatchWallet,
  RegTestWatchWallet,
} from "./Wif";
import { WalletRequestI, WalletResponseI } from "./interface";
import { PrivKeySmartBchWallet, RegTestPrivKeySmartBchWallet, RegTestSmartBchWallet, RegTestWatchSmartBchWallet, SmartBchWallet, TestNetPrivKeySmartBchWallet, TestNetSmartBchWallet, TestNetWatchSmartBchWallet, WatchSmartBchWallet } from "../smartbch/SmartBchWallet";

type platform = "bch" | "smartbch";

// Convenience map to access classes by types and network
export const walletClassMap = {
  bch: {
    wif: {
      mainnet: () => WifWallet,
      testnet: () => TestNetWifWallet,
      regtest: () => RegTestWifWallet,
    },
    seed: {
      mainnet: () => Wallet,
      testnet: () => TestNetWallet,
      regtest: () => RegTestWallet,
    },
    watch: {
      mainnet: () => WatchWallet,
      testnet: () => TestNetWatchWallet,
      regtest: () => RegTestWatchWallet,
    },
  },
  smartbch: {
    privkey: {
      mainnet: () => PrivKeySmartBchWallet,
      testnet: () => TestNetPrivKeySmartBchWallet,
      regtest: () => RegTestPrivKeySmartBchWallet,
    },
    seed: {
      mainnet: () => SmartBchWallet,
      testnet: () => TestNetSmartBchWallet,
      regtest: () => RegTestSmartBchWallet,
    },
    watch: {
      mainnet: () => WatchSmartBchWallet,
      testnet: () => TestNetWatchSmartBchWallet,
      regtest: () => RegTestWatchSmartBchWallet,
    },
  }
};

function getWalletClass(body: WalletRequestI) {
  body.platform = body.platform ? body.platform : "bch";
  body.type = (body.type ? body.type : "seed") as WalletTypeEnum;
  body.network = body.network ? body.network : "mainnet";

  return walletClassMap[body.platform][body.type][body.network]();
}

/**
 * Check wallet type and network of a requested wallet for mismatches against retrieved from DB
 */
function checkWalletTypeAndNetwork(wallet: Wallet, walletType, networkType) {
  if (wallet.network != networkType) {
    throw Error(
      `A wallet already exists with name ${wallet.name}, but with network ${wallet.network} not ${networkType}, per request`
    );
  }
  if (wallet.walletType != walletType) {
    throw Error(
      `A wallet already exists with name ${wallet.name}, but with type ${wallet.walletType} not ${walletType}, per request`
    );
  }
}

/**
 * Check if wallet exists
 * @param body A wallet request object
 * @returns A promise to the check result
 */
export async function namedWalletExists(body): Promise<boolean> {
  const name = body.name;

  return getWalletClass(body).namedExists(name);
}

/**
 * Get or create a named wallet
 * @param name user friendly wallet alias
 * @param walletType wallet type
 * @param networkType wallet network type
 * @returns A promise to a new wallet object
 */
export async function namedWallet(
  body: WalletRequestI
): Promise<Wallet> {
  const name = body.name;

  // Named wallets are saved in the database
  if (!name) {
    throw Error(`Wallet name is required for this operation`);
  }

  const wallet = await getWalletClass(body).named(name);
  checkWalletTypeAndNetwork(wallet, body.type, body.network);
  return wallet;
}

/**
 * Replace or create a named wallet with a walletId
 * @param body A wallet request object
 * @returns A promise to a new wallet object
 */
export async function replaceNamedWallet(body: WalletRequestI): Promise<Wallet> {
  let wallet;
  const name = body.name;
  const walletId = body.walletId;

  // Named wallets are saved in the database
  if (!name || !walletId) {
    throw Error(`Wallet name and walletId are required for this operation`);
  }

  wallet = await getWalletClass(body).replaceNamed(
    name,
    walletId
  );
  return wallet;
}

/**
 * Create a new wallet
 * @param body A wallet request object
 * @returns A promise to a new wallet object
 */
export async function createWallet(body: WalletRequestI): Promise<Wallet> {
  let wallet;

  // Named wallets are saved in the database
  if (body.name && body.name.length > 0) {
    wallet = await namedWallet(body);
    return wallet;
  }
  // This handles unsaved/unnamed wallets
  else {
    let walletClass = getWalletClass(body);
    wallet = new walletClass();
    wallet.walletType = body.type;
    return wallet.generate();
  }
}

/**
 * Create a new SLP aware wallet
 * @param body A wallet request object
 * @returns A promise to a new wallet object
 */
export async function createSlpWallet(body: WalletRequestI): Promise<Wallet> {
  let wallet;

  // Named wallets are saved in the database
  if (body.name && body.name.length > 0) {
    wallet = await getWalletClass(body).slp.named(body.name);
    if (wallet.network != body.network) {
      throw Error(
        `A wallet already exists with name ${body.name}, but with network ${wallet.network} not ${body.network}, per request`
      );
    }
    if (wallet.walletType != body.type) {
      throw Error(
        `A wallet already exists with name ${body.name}, but with type ${wallet.walletType} not ${body.type}, per request`
      );
    }
    return wallet;
  }
  // This handles unsaved/unnamed wallets
  else {
    wallet = await getWalletClass(body).slp.newRandom();
    wallet.walletType = body.type;
    return wallet;
  }
}

/**
 * Create a new wallet
 * @param walletRequest A wallet request object
 * @returns A new wallet object
 */
export async function createWalletResponse(
  walletRequest: WalletRequestI
): Promise<WalletResponseI> {
  let wallet = await createWallet(walletRequest);
  if (wallet) {
    return asJsonResponse(wallet);
  } else {
    throw Error("Error creating wallet");
  }
}

/**
 * Create a new SLP aware wallet
 * @param walletRequest A wallet request object
 * @returns A new wallet object
 */
export async function createSlpWalletResponse(
  walletRequest: WalletRequestI
): Promise<WalletResponseI> {
  let wallet = await createSlpWallet(walletRequest);
  if (wallet) {
    return asJsonResponse(wallet);
  } else {
    throw Error("Error creating wallet");
  }
}

/**
 * asJsonResponse return a wallet as json
 * @param wallet A wallet object
 * @returns A json wallet response
 */
function asJsonResponse(wallet: Wallet): WalletResponseI {
  if (wallet.mnemonic) {
    return {
      name: wallet.name,
      cashaddr: wallet.cashaddr as string,
      slpaddr: wallet.slp.slpaddr,
      walletId: wallet.toString(),
      ...wallet.getSeed(),
      network: wallet.network as any,
    };
  } else {
    return {
      name: wallet.name,
      cashaddr: wallet.cashaddr as string,
      slpaddr: wallet.slp.slpaddr,
      walletId: wallet.toString(),
      wif: wallet.privateKeyWif,
      network: wallet.network as any,
    };
  }
}

/**
 * walletFromId - get a wallet from a serialized wallet
 * @param {string} walletId A serialized wallet object
 * @returns A wallet
 */
export async function walletFromId(walletId: string, platform: platform = "bch"): Promise<any> {
  let [walletType, network, name]: string[] = walletId.split(":");

  const body: WalletRequestI = { platform, name, type: walletType as WalletTypeEnum, network };

  if (walletType === "named") {
    const wallet = await namedWallet({ ...body, ...{type: "seed" as WalletTypeEnum }});
    checkWalletTypeAndNetwork(wallet, "seed", network);
    return wallet;
  }

  const wallet = await getWalletClass(body).fromId(walletId);
  checkWalletTypeAndNetwork(wallet, walletType, network);
  return wallet;
}
