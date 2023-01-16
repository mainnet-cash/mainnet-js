export * from "./db/index.js";
export * from "./mine/index.js";
export * from "./slp/index.js";
export * from "./test/expect.js";
export * from "./test/axios.js";
export * from "./webhook/index.js";
export * from "./wallet/Bcmr.js";

export * from "./network/index.js";
export { SignedMessage } from "./message/signed.js";

export { BaseWallet } from "./wallet/Base.js";
export * from "./wallet/Wif.js";
export * from "./wallet/createWallet.js";

// provider
export { DefaultProvider } from "./network/configuration.js";

// config
export { Config } from "./config.js";

// Enum
export { NetworkType, UnitEnum } from "./enum.js";
export { WalletTypeEnum } from "./wallet/enum.js";

// models
export * from "./wallet/model.js";

// utils
import * as Mainnet from "./util/index.js";
export { Mainnet };
export * from "./util/index.js";

// libauth
export * as libauth from "./libauth.js";

// qr
export * from "./qr/Qr.js";

// constants
import * as CONST from "./constant.js";
export { CONST };

// interfaces
export * from "./interface.js";
export { ImageI } from "./qr/interface.js";
export {
  SignedMessageResponseI,
  VerifyMessageResponseI,
} from "./message/interface.js";
export { WalletRequestI, WalletResponseI } from "./wallet/interface.js";

// TODO move this up to util (Mainnet) ?
export * from "./util/bchaddr.js";

export function cube(x: number) {
  return x * x * x;
}
