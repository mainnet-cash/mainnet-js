import { Wallet, RegTestWallet, TestNetWallet } from "../wallet/Wif"

export default interface StorageProvider {
  
  /**
   * Ensure the database exists and is open
   * @throws {Error} If the wallet could not be opened.
   * @returns if the operation was successful.
   */
  init(): Promise<boolean>;

  /**
   * Manually close the database
   * @throws {Error} If the wallet could not be opened.
   * @returns if the operation was successful.
   */
  close(): Promise<boolean>;

  
  /**
   * Add a wallet to the database
   * @param name A user defined name for the wallet, and the walletId.
   * @param wallet String used to reconstruct the wallet.
   * @throws {Error} If the wallet could not be saved.
   * @returns if the operation was successful.
   */
  addWallet(name: string, wallet: string): Promise<boolean>;

  /**
   * @returns All saved wallets.
   */
  getWallets(): Promise<Array<Wallet | TestNetWallet | RegTestWallet>>;

  /**
   * Get a named wallet to the database
   * @param name A user defined name for the wallet.
   * @throws {Error} If the wallet could not be saved.
   * @returns The requested wallet.
   */
  getWallet(name: string): Promise<Wallet | TestNetWallet | RegTestWallet | undefined>;
}
