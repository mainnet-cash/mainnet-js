// config
export { Config } from "./config.js";

// Enum
export { NetworkType, UnitEnum } from "./enum.js";
export { FeePaidByEnum, WalletTypeEnum } from "./wallet/enum.js";

// message
export { SignedMessage } from "./message/signed.js";

// provider
export { DefaultProvider } from "./network/configuration.js";

// network
export {
  createProvider,
  getGlobalProvider,
  getNetworkProvider,
  removeGlobalProvider,
  setGlobalProvider,
} from "./network/default.js";
export {
  disconnectProviders,
  initProvider,
  initProviders,
} from "./network/Connection.js";
export { default as ElectrumNetworkProvider } from "./network/ElectrumNetworkProvider.js";
export type { default as NetworkProvider } from "./network/NetworkProvider.js";
export type {
  ElectrumRawTransaction,
  ElectrumRawTransactionVinWithValues,
  ElectrumRawTransactionWithInputValues,
} from "./network/interface.js";

// db
export { default as StorageProvider } from "./db/StorageProvider.js";
export type { WalletDbEntryI } from "./db/interface.js";

// mine
export { mine } from "./mine/mine.js";

// wallets — explicit exports for tree-shaking
export { BaseWallet } from "./wallet/Base.js";
export { WatchWallet, TestNetWatchWallet, RegTestWatchWallet } from "./wallet/Watch.js";
export {
  Wallet,
  TestNetWallet,
  RegTestWallet,
  WifWallet,
  TestNetWifWallet,
  RegTestWifWallet,
} from "./wallet/Wif.js";
export {
  HDWallet,
  TestNetHDWallet,
  RegTestHDWallet,
} from "./wallet/HDWallet.js";

// wallet utilities, models, interfaces — barrel re-export is fine (small items)
export * from "./wallet/createWallet.js";
export * from "./wallet/model.js";
export * from "./wallet/interface.js";

// history
export { getHistory } from "./history/getHistory.js";
export * from "./history/interface.js";

// utils
export * from "./util/index.js";

// libauth re-export (backward compatibility)
export * as libauth from "./libauth.js";

// interfaces
export * from "./interface.js";
export type {
  SignedMessageResponseI,
  VerifyMessageResponseI,
} from "./message/interface.js";
