import { prefixFromNetworkMap } from "../enum.js";
import { getNamedWalletId } from "./Base.js";
import { HDWallet, RegTestHDWallet, TestNetHDWallet } from "./HDWallet.js";
import {
  RegTestWatchWallet,
  TestNetWatchWallet,
  WatchWallet,
} from "./Watch.js";
import {
  RegTestWallet,
  RegTestWifWallet,
  TestNetWallet,
  TestNetWifWallet,
  Wallet,
  WifWallet,
} from "./Wif.js";
import { WalletRequestI, WalletResponseI } from "./interface.js";

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
  hd: {
    mainnet: () => {
      return HDWallet;
    },
    testnet: () => {
      return TestNetHDWallet;
    },
    regtest: () => {
      return RegTestHDWallet;
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
    const walletId = await getNamedWalletId(name, dbName);
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
  const walletType = body.type ? body.type : "seed";
  const networkType = body.network ? body.network : "mainnet";

  // Named wallets are saved in the database
  if (body.name && body.name.length > 0) {
    const wallet = await namedWallet(body.name, walletType, networkType);
    return wallet;
  }
  // This handles unsaved/unnamed wallets
  else {
    const walletClass = walletClassMap[walletType][networkType]();
    const wallet = new walletClass();
    wallet.walletType = walletType;
    return wallet.initialize();
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
  const wallet = await createWallet(walletRequest);
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
      walletId: wallet.toString(),
      ...wallet.getSeed(),
      network: wallet.network as any,
    };
  } else {
    return {
      name: wallet.name,
      cashaddr: wallet.cashaddr as string,
      walletId: wallet.toString(),
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
  const [walletType, network, name]: string[] = walletId.split(":");

  if (walletType === "named") {
    return await namedWallet(name, walletType, network);
  }

  const walletClass = walletClassMap[walletType][network]();
  const wallet = new walletClass();
  wallet.walletType = walletType;

  await (wallet as any).fromId(walletId);
  return wallet;
}
