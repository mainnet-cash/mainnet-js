import { TxI, UtxoI, Network, HeaderI } from "../interface";

export default interface NetworkProvider {
  /**
   * Variable indicating the network that this provider connects to.
   */
  network: Network;

  /**
   * Retrieve all UTXOs (confirmed and unconfirmed) for a given address.
   * @param cashaddr The CashAddress for which we wish to retrieve UTXOs.
   * @returns List of UTXOs spendable by the provided address.
   */
  getUtxos(cashaddr: string): Promise<UtxoI[]>;

  /**
   * Retrieve all balance of an address in satoshi
   * @param cashaddr The CashAddress for which we wish to retrieve UTXOs.
   * @returns the balance.
   */
  getBalance(cashaddr: string): Promise<number>;

  /**
   * @returns The current block height.
   */
  getBlockHeight(): Promise<number>;

  /**
   * Retrieve the Hex transaction details for a given transaction ID.
   * @param txHex Hex transaction ID.
   * @param verbose Whether a verbose coin-specific response is required.
   * @throws {Error} If the transaction does not exist
   * @returns The full hex transaction for the provided transaction ID.
   */
  getRawTransaction(txHex: string): Promise<string>;

  /**
   * Retrieve a verbose coin-specific response transaction details for a given transaction ID.
   * @param txHex Hex transaction ID.
   * @throws {Error} If the transaction does not exist
   * @returns The full hex transaction for the provided transaction ID.
   */
  getRawTransactionObject(txHex: string): Promise<any>;

  /**
   * Broadcast a raw hex transaction to the Bitcoin Cash network.
   * @param txHex The raw transaction hex to be broadcast.
   * @throws {Error} If the transaction was not accepted by the network.
   * @returns The transaction ID corresponding to the broadcast transaction.
   */
  sendRawTransaction(txHex: string): Promise<string>;

  /**
   * Return the confirmed and unconfirmed history of a Bitcoin Cash address.
   * @param cashaddr The CashAddress for which we wish to retrieve history.
   * @throws {Error} When failing to get history.
   * @returns Array of transactions.
   */
  getHistory(cashaddr: string): Promise<TxI[]>;

  /**
   * Wait for the next block or a block at given blockchain height.
   * @param height If specified, waits for blockchain to reach this height.
   * @returns Block header.
   */
  waitForBlock(height?: number): Promise<HeaderI>;

  /**
   * Subscribe to the address change events
   * @param cashaddr The CashAddress for which we wish to retrieve history.
   * @throws {Error} If the subscription failed.
   * @returns nothing.
   */
  subscribeToAddress(
    cashaddr: string,
    callback: (data: any) => void
  ): Promise<void>;

  /**
   * Unsubscribe from the address change events
   * @param cashaddr The CashAddress for which we wish to retrieve history.
   * @throws {Error} If the unsubscription failed.
   * @returns nothing.
   */
  unsubscribeFromAddress(
    cashaddr: string,
    callback: (data: any) => void
  ): Promise<void>;

  /**
   * Function to wait for connection to be ready
   * @param timeout number of milliseconds to wait before throwing error
   * @returns true when ready, or an error
   */
  ready(timeout?: number): Promise<boolean | unknown>;

  /**
   * Function to connect manually if using persistent connections
   * @returns array of connection boolean successes, or throws error
   */
  connect(): Promise<void[]>;

  /**
   * Function to disconnect manually if using persistent connections
   * @returns array of connection boolean successes, or throws error
   */
  disconnect(): Promise<boolean[]>;
}
