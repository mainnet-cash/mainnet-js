

export default interface StorageProvider {


    /**
   * Add a wallet to the database
   * @param name A user defined name for the wallet transaction hex to be broadcast.
   * @throws {Error} If the wallet could not be saved.
   * @returns .
   */
    addWallet(name: string, walet: string): Promise<boolean>


    getWallets(): Promise<string[]>;
    getWallet(): Promise<string>;
}