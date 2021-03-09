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

// interface SignMessageFunc {
//   sign(message: string, privateKey: Uint8Array): Promise<string>
// }

// interface VerifyMessageFunc {
//   verify(message: string,
//     signature: string,
//     cashaddr: string): Promise<boolean>;
// }

export interface SignedMessageI {
  sign(message: string, privateKey: Uint8Array): Promise<string>;
  verify(
    message: string,
    signature: string,
    cashaddr: string
  ): Promise<boolean>;
}
