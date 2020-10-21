import StorageProvider from "./StorageProvider";
import { walletFromId } from "../wallet/createWallet";
import { WalletI } from "./interface";
import { Pool } from "pg";
import { Wallet, RegTestWallet, TestNetWallet } from "../wallet/Wif";

export default class SqlProvider implements StorageProvider {
  private db;
  private name: string;

  public constructor() {
    this.name = "wallet";
    this.db = new Pool();
  }

  public async init(): Promise<boolean> {
    let createWalletTable = `CREATE TABLE IF NOT EXISTS ${this.name} (id SERIAL, name TEXT PRIMARY KEY, wallet TEXT );`;
    const res = this.db.query(createWalletTable);
    return res;
  }

  public async close(): Promise<boolean> {
    return this.db.end();
  }

  public async addWallet(name: string, wallet: string): Promise<boolean> {
    let text = `INSERT into wallet (name,wallet) VALUES ($1, $2) ;`;
    return await this.db.query(text, [name, wallet]);
  }

  public async getWallets(): Promise<
    Array<Wallet | TestNetWallet | RegTestWallet>
  > {
    let text = `SELECT * FROM wallet`;
    let result = this.db.query(text);
    if (result) {
      const WalletArray: (
        | Wallet
        | TestNetWallet
        | RegTestWallet
      )[] = await Promise.all(
        result.rows.map(async (obj: WalletI) => {
          let w = await walletFromId(obj.wallet);
          w.name = obj!.name;
          return w;
        })
      );
      return WalletArray;
    } else {
      return [];
    }
  }

  public async getWallet(
    name: string
  ): Promise<Wallet | TestNetWallet | RegTestWallet | undefined> {
    let text = `SELECT * FROM wallet WHERE name = $1`;
    let result = await this.db.query(text, [name]);
    let w = await walletFromId(result.rows[0].wallet);
    w.name = result.rows[0].name;
    return w;
  }
}
