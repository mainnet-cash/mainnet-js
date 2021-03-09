// interface EncryptedMessageFunc {
//     (message: string, privateKey: string): string;
//   }

//   interface DecryptedMessageFunc {
//     (message: string, publicKeyHash: string): string;
//   }

// export interface EncryptedMessageI{
//     encrypt: EncryptedMessageFunc
//     decrypt: DecryptedMessageFunc
// }

interface SignMessageFunc {
  (message: string, privateKey: string): string;
}

interface VerifyMessageFunc {
  (message: string, publicKeyHash: string): string;
}

export interface SignedMessageI {
  sign: SignMessageFunc;
  verify: VerifyMessageFunc;
}
