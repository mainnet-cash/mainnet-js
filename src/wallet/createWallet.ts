import { NetworkEnum, WalletTypeEnum } from "./enum";
import { RegTestWallet, TestnetWallet, MainnetWallet, WifWallet } from "./Wif";

interface WalletRequest {
  name: string;
  network: string;
  type: WalletTypeEnum;
}

interface WalletResponse {
  name: string;
  cashaddr: string;
  walletId: string;
  network?: NetworkEnum;
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
      wallet = new TestnetWallet(body.name);
      break;
    case "mainnet":
      wallet = new MainnetWallet(body.name);
      break;
    default:
      wallet = new MainnetWallet(body.name);
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

export async function walletFromIdString(
  walletId: string
): Promise<MainnetWallet | TestnetWallet | RegTestWallet> {
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
