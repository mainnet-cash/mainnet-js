import { WalletTypeEnum } from "./enum";
import {
  Wallet,
  TestNetWallet,
  RegTestWallet,
  WifWallet,
  TestNetWifWallet,
  RegTestWifWallet,
} from "./Wif";
import { WalletRequestI, WalletResponseI } from "./interface";

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
};

export async function createWallet(body: WalletRequestI): Promise<Wallet> {
  let wallet;
  let walletType = body.type ? body.type : "seed";
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
    wallet.walletType = walletType;
    return wallet.generate();
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

function asJsonResponse(wallet: Wallet): WalletResponseI {
  return {
    name: wallet.name,
    cashaddr: wallet.cashaddr as string,
    walletId: wallet.toString(),
    network: wallet.network,
  };
}

export async function walletFromId(walletId: string): Promise<any> {
  let [walletType, network]: string[] = walletId.split(":");

  let walletRequest = {
    name: "",
    network: network,
    type: WalletTypeEnum[walletType],
  } as WalletRequestI;
  let wallet = await createWallet(walletRequest);
  await wallet._fromId(walletId);
  return wallet;
}
