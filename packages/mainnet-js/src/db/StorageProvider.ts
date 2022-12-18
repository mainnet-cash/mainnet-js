import { WalletI } from "./interface.js";

export default interface StorageProvider {
  /**
   * Ensure the database exists and is open
   * @throws {Error} If the wallet could not be opened.
   * @returns the storage provider
   */
  init(): Promise<StorageProvider>;

  /**
   * Manually close the database
   * @throws {Error} If the wallet could not be opened.
   * @returns the storage provider
   */
  close(): Promise<StorageProvider>;

  /**
   * Returns information about the storage provider
   * @throws {Error} If there is no info
   * @returns string
   */
  getInfo(): string;

  /**
   * Add a wallet to the database
   * @param name A user defined name for the wallet, and the walletId.
   * @param walletId String used to reconstruct the wallet.
   * @throws {Error} If the wallet could not be saved.
   * @returns if the operation was successful.
   */
  addWallet(name: string, walletId: string): Promise<boolean>;

  /**
   * @returns All saved wallets.
   */
  getWallets(): Promise<Array<WalletI>>;

  /**
   * Get a named wallet from the database
   * @param name A user defined name for the wallet.
   * @throws {Error} If the wallet could not be saved.
   * @returns The requested wallet.
   */
  getWallet(name: string): Promise<WalletI | undefined>;

  /**
   * Update named wallet in the database
   * @param name A user defined name for the wallet, and the walletId.
   * @param walletId String used to reconstruct the wallet.
   * @throws {Error} If the wallet could not be saved.
   */
  updateWallet(name: string, walletId: string): Promise<void>;

  /**
   * Check if wallet exists in the database
   * @param name A user defined name for the wallet, and the walletId.
   */
  walletExists(name: string): Promise<boolean>;
}
