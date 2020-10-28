import StorageProvider from "./StorageProvider";
import { WalletI } from "./interface";
import { Pool } from "pg";
import { default as format } from "pg-format";

export default class SqlProvider implements StorageProvider {
  private db;
  private dbName: string;

  public constructor(dbName?: string) {
    this.dbName = dbName ? dbName : "wallet";
    this.db = new Pool();
  }

  public async init(): Promise<StorageProvider> {
    let createWalletTable = format(
      "CREATE TABLE IF NOT EXISTS %I (id SERIAL, name TEXT PRIMARY KEY, wallet TEXT );",
      this.dbName
    );
    const res = this.db.query(createWalletTable);
    return res;
  }

  public async close(): Promise<StorageProvider> {
    await this.db.end();
    return this;
  }

  public async addWallet(name: string, wallet: string): Promise<boolean> {
    let text = format(
      "INSERT into %I (name,wallet) VALUES ($1, $2);",
      this.dbName
    );
    return await this.db.query(text, [name, wallet]);
  }

  public async getWallets(): Promise<Array<WalletI>> {
    let text = format("SELECT * FROM %I", this.dbName);
    let result = await this.db.query(text);
    if (result) {
      const WalletArray: WalletI[] = await Promise.all(
        result.rows.map(async (obj: WalletI) => {
          return obj;
        })
      );
      return WalletArray;
    } else {
      return [];
    }
  }

  public async getWallet(name: string): Promise<WalletI | undefined> {
    let text = format("SELECT * FROM %I WHERE name = $1", this.dbName);
    let result = await this.db.query(text, [name]);
    let w = result.rows[0];
    return w;
  }
}
