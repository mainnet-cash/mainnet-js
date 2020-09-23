import { WalletImportFormatType } from "@bitauth/libauth";

export interface PrivateKey {
  privateKey: Uint8Array;
  type: WalletImportFormatType;
}
