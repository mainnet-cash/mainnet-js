export * from "./db/index";
export * from "./mine/index";
export * from "./slp/index";
export * from "./test/expect";
export * from "./webhook/index";

export * from "./network/index";
export { SignedMessage } from "./message/signed";

export { BaseWallet } from "./wallet/Base";
export * from "./wallet/Wif";
export * from "./wallet/createWallet";

// Enum
export { NetworkType, UnitEnum } from "./enum";
export { WalletTypeEnum } from "./wallet/enum";

// models
export { SendRequest, UtxoItem } from "./wallet/model";

// utils
import * as Mainnet from "./util/index";
export { Mainnet };

// constants
import * as CONST from "./constant";
export { CONST };

// interfaces
export { UtxoI } from "./interface";
export { Network } from "./interface";
export { ImageI } from "./qr/interface";
export {
  SignedMessageResponseI,
  VerifyMessageResponseI,
} from "./message/interface";
export { WalletRequestI, WalletResponseI } from "./wallet/interface";

// TODO move this up to util (Mainnet) ?
export * from "./util/bchaddr";

export function cube(x: number) {
  return x * x * x;
}
