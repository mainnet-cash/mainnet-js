// config
export { Config } from "./config.js";
export type { WalletDbEntryI } from "./db/interface.js";
// db
export { default as StorageProvider } from "./db/StorageProvider.js";
// Enum
export { NetworkType, UnitEnum } from "./enum.js";
// history
export { getHistory } from "./history/getHistory.js";
export * from "./history/interface.js";
// interfaces
export * from "./interface.js";
// libauth re-export (backward compatibility)
export * as libauth from "./libauth.js";
export type {
  SignedMessageResponseI,
  VerifyMessageResponseI,
} from "./message/interface.js";
// message
export { SignedMessage } from "./message/signed.js";
// mine
export { mine } from "./mine/mine.js";
export {
  disconnectProviders,
  initProvider,
  initProviders,
} from "./network/Connection.js";
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
export { default as ElectrumNetworkProvider } from "./network/ElectrumNetworkProvider.js";
export type {
  ElectrumRawTransaction,
  ElectrumRawTransactionVinWithValues,
  ElectrumRawTransactionWithInputValues,
} from "./network/interface.js";
export type { default as NetworkProvider } from "./network/NetworkProvider.js";
// xpub utilities
export {
  derivePublicNodeCashaddr,
  getAddrsByXpubKey,
  getAddrsByXpubKeyObject,
  getXpubKeyInfo,
  getXpubKeyInfoObject,
} from "./util/getAddrsByXpubKey.js";
export { getXPubKey } from "./util/getXPubKey.js";
export { deriveHdPaths, getXPubKeys } from "./util/hd.js";
// utils
export * from "./util/index.js";
// wallets - explicit exports for tree-shaking
export { BaseWallet } from "./wallet/Base.js";
// wallet utilities, models, interfaces - barrel re-export is fine (small items)
export * from "./wallet/createWallet.js";
export { FeePaidByEnum, WalletTypeEnum } from "./wallet/enum.js";
export {
  HDWallet,
  RegTestHDWallet,
  TestNetHDWallet,
} from "./wallet/HDWallet.js";
export * from "./wallet/interface.js";
export * from "./wallet/model.js";
// transaction utilities
export { decodeTransaction, getTransactionHash } from "./wallet/Util.js";
export {
  RegTestWatchWallet,
  TestNetWatchWallet,
  WatchWallet,
} from "./wallet/Watch.js";
export {
  RegTestWallet,
  RegTestWifWallet,
  TestNetWallet,
  TestNetWifWallet,
  Wallet,
  WifWallet,
} from "./wallet/Wif.js";
