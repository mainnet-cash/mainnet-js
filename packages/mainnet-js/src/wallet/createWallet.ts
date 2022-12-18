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
} from "./Wif.js";
import { getNamedWalletId } from "./Base.js";
import { WalletRequestI, WalletResponseI } from "./interface.js";
import { prefixFromNetworkMap } from "../enum.js";

// Convenience map to access classes by types and network
export const walletClassMap = {
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
  seed: {
    mainnet: () => {
      return Wallet;
    },
    testnet: () => {
      return TestNetWallet;
    },
    regtest: () => {
      return RegTestWallet;
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
  const walletType = body.type ? body.type : "seed";
  const networkType = body.network ? body.network : "mainnet";
  const name = body.name;

  return await walletClassMap[walletType][networkType]().namedExists(name);
}

/**
 * Get or create a named wallet
 * @param name user friendly wallet alias
 * @param walletType wallet type
 * @param networkType wallet network type
 * @returns A promise to a new wallet object
 */
export async function namedWallet(
  name,
  walletType,
  networkType
): Promise<Wallet> {
  // Named wallets are saved in the database
  if (!name) {
    throw Error(`Wallet name is required for this operation`);
  }

  let wallet;
  const dbName = prefixFromNetworkMap[networkType];
  if (walletClassMap[walletType] !== undefined) {
    wallet = await walletClassMap[walletType][networkType]().named(name);
    checkWalletTypeAndNetwork(wallet, walletType, networkType);
  } else {
    let walletId = await getNamedWalletId(name, dbName);
    if (walletId !== undefined) {
      wallet = await walletFromId(walletId);
      wallet.name = name;
    } else {
      throw Error(
        "A named wallet, without wallet type, was passed but there was no corresponding record for the named wallet in the database."
      );
    }
  }

  return wallet;
}

/**
 * Replace or create a named wallet with a walletId
 * @param body A wallet request object
 * @returns A promise to a new wallet object
 */
export async function replaceNamedWallet(body): Promise<Wallet> {
  let wallet;
  const walletType = body.type ? body.type : "seed";
  const networkType = body.network ? body.network : "mainnet";
  const name = body.name;
  const walletId = body.walletId;

  // Named wallets are saved in the database
  if (!name || !walletId) {
    throw Error(`Wallet name and walletId are required for this operation`);
  }

  wallet = await walletClassMap[walletType][networkType]().replaceNamed(
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
  let walletType = body.type ? body.type : "seed";
  let networkType = body.network ? body.network : "mainnet";

  // Named wallets are saved in the database
  if (body.name && body.name.length > 0) {
    wallet = await namedWallet(body.name, walletType, networkType);
    return wallet;
  }
  // This handles unsaved/unnamed wallets
  else {
    let walletClass = walletClassMap[walletType][networkType]();
    wallet = await new walletClass();
    wallet.walletType = walletType;
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
  let walletType = body.type ? body.type : "seed";
  let networkType = body.network ? body.network : "mainnet";

  // Named wallets are saved in the database
  if (body.name && body.name.length > 0) {
    wallet = await walletClassMap[walletType][networkType]().slp.named(
      body.name
    );
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
    wallet = await walletClassMap[walletType][networkType]().slp.newRandom();
    wallet.walletType = walletType;
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
export async function walletFromId(walletId: string): Promise<any> {
  let [walletType, network, name]: string[] = walletId.split(":");

  if (walletType === "named") {
    return await namedWallet(name, walletType, network);
  }
  let walletRequest = {
    name: "",
    network: network,
    type: walletType,
  } as WalletRequestI;
  let wallet = await createWallet(walletRequest);
  await (wallet as any).fromId(walletId);
  return wallet;
}
