import { WalletDbEntryI } from "./interface.js";

export default abstract class StorageProvider {
  public constructor(...args: any[]) {
    throw new Error("StorageProvider is abstract and cannot be instantiated");
  }

  /**
   * Ensure the database exists and is open
   * @throws {Error} If the wallet could not be opened.
   * @returns the storage provider
   */
  abstract init(): Promise<StorageProvider>;

  /**
   * Manually close the database
   * @throws {Error} If the wallet could not be opened.
   * @returns the storage provider
   */
  abstract close(): Promise<StorageProvider>;

  /**
   * Returns information about the storage provider
   * @throws {Error} If there is no info
   * @returns string
   */
  abstract getInfo(): string;

  /**
   * Add a wallet to the database
   * @param name A user defined name for the wallet, and the walletId.
   * @param walletId String used to reconstruct the wallet.
   * @throws {Error} If the wallet could not be saved.
   * @returns if the operation was successful.
   */
  abstract addWallet(name: string, walletId: string): Promise<boolean>;

  /**
   * @returns All saved wallets.
   */
  abstract getWallets(): Promise<Array<WalletDbEntryI>>;

  /**
   * Get a named wallet from the database
   * @param name A user defined name for the wallet.
   * @throws {Error} If the wallet could not be saved.
   * @returns The requested wallet.
   */
  abstract getWallet(name: string): Promise<WalletDbEntryI | undefined>;

  /**
   * Update named wallet in the database
   * @param name A user defined name for the wallet, and the walletId.
   * @param walletId String used to reconstruct the wallet.
   * @throws {Error} If the wallet could not be saved.
   */
  abstract updateWallet(name: string, walletId: string): Promise<void>;

  /**
   * Check if wallet exists in the database
   * @param name A user defined name for the wallet, and the walletId.
   */
  abstract walletExists(name: string): Promise<boolean>;
}
