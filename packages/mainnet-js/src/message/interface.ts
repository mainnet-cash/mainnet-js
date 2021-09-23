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
  sign(
    message: string,
    privateKey: Uint8Array
  ): Promise<SignedMessageResponseI>;
  verify(
    message: string,
    signature: string,
    cashaddr: string,
    publicKey?: Uint8Array
  ): Promise<VerifyMessageResponseI>;
}

export interface SignedMessageRawI {
  ecdsa: string;
  schnorr: string;
  der: string;
}

export interface SignedMessageDetailsI {
  recoveryId: number;
  compressed: boolean;
  messageHash: string;
}

export interface SignedMessageResponseI {
  raw?: SignedMessageRawI;
  details?: SignedMessageDetailsI;
  signature: string;
}

export interface VerifyMessageDetailsI {
  signatureType: string;
  messageHash: string;
  signatureValid: boolean;
  publicKeyHashMatch: boolean;
}

export interface VerifyMessageResponseI {
  valid: boolean;
  details?: VerifyMessageDetailsI;
}
