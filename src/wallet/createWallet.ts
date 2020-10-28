import { NetworkEnum, WalletTypeEnum } from "./enum";
import { Wallet, TestNetWallet, RegTestWallet } from "./Wif";

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

var walletClassMap = {
  wif: {
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

function asJsonResponse(wallet: Wallet): WalletResponse {
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
  await wallet.fromWIF(walletData);
  return wallet;
}
