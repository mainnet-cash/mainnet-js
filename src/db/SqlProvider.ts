import StorageProvider from "./StorageProvider";
import { WalletI, WebHookI } from "./interface";
import { Pool } from "pg";
import { default as format } from "pg-format";
var parseDbUrl = require("parse-database-url");

export default class SqlProvider implements StorageProvider {
  public db;
  private walletTable: string;
  private webHookTable: string;

  public constructor(walletTable?: string) {
    this.walletTable = walletTable ? walletTable : "wallet";
    this.webHookTable = "webhook";
    var dbConfig = parseDbUrl(process.env["DATABASE_URL"]);
    this.db = new Pool(dbConfig);
  }

  public async init(): Promise<StorageProvider> {
    let createWalletTable = format(
      "CREATE TABLE IF NOT EXISTS %I (id SERIAL, name TEXT PRIMARY KEY, wallet TEXT );",
      this.walletTable
    );
    const resWallet = this.db.query(createWalletTable);

    let createWebHookTable = format(
      "CREATE TABLE IF NOT EXISTS %I ("+
        "id SERIAL PRIMARY KEY,"+
        "address TEXT,"+
        "type TEXT,"+
        "recurrence TEXT,"+
        "hook_url TEXT,"+
        "status TEXT,"+
        "last_tx TEXT,"+
        "expires_at DATE,"+
        "hash TEXT"+
      ");",
      this.webHookTable
    );
    const resWebHook = this.db.query(createWebHookTable);

    return resWallet && resWebHook;
  }

  public async close(): Promise<StorageProvider> {
    await this.db.end();
    return this;
  }

  public async addWallet(name: string, wallet: string): Promise<boolean> {
    let text = format(
      "INSERT into %I (name,wallet) VALUES ($1, $2);",
      this.walletTable
    );
    return await this.db.query(text, [name, wallet]);
  }

  public async getWallets(): Promise<Array<WalletI>> {
    let text = format("SELECT * FROM %I", this.walletTable);
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
    let text = format("SELECT * FROM %I WHERE name = $1", this.walletTable);
    let result = await this.db.query(text, [name]);
    let w = result.rows[0];
    return w;
  }

  public async addWebHook(address: string, type: string, hook_url: string, recurrence?: string, duration_sec?: number): Promise<number> {
    recurrence = recurrence || "once";
    const expireTimeout = Number(process.env.WEBHOOK_EXPIRE_TIMEOUT_SECONDS) || 86400;
    duration_sec = duration_sec || expireTimeout;
    duration_sec = duration_sec > expireTimeout ? expireTimeout : duration_sec * 1000;
    const expires_at = new Date((new Date()).getTime() + duration_sec);
    let text = format(
      "INSERT into %I (address,type,recurrence,hook_url,status,last_tx,expires_at,hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;",
      this.webHookTable
    );

     const result = await this.db.query(text, [address,type,recurrence,hook_url,"","",expires_at.toISOString(),""]);
     return result.rows[0].id;
  }

  public async getWebHooks(): Promise<Array<WebHookI>> {
    let text = format("SELECT * FROM %I", this.webHookTable);
    let result = await this.db.query(text);
    if (result) {
      const WebHookArray: WebHookI[] = await Promise.all(
        result.rows.map(async (obj: WebHookI) => {
          return obj;
        })
      );
      return WebHookArray;
    } else {
      return [];
    }
  }

  public async getWebHook(id: number): Promise<WebHookI | undefined> {
    let text = format("SELECT * FROM %I WHERE id = $1;", this.webHookTable);
    let result = await this.db.query(text, [id]);
    let w = result.rows[0];
    return w;
  }

  public async setWebHookStatus(id: number, status: string): Promise<void> {
    let text = format("UPDATE %I SET status = $1 WHERE id = $2;", this.webHookTable);
    await this.db.query(text, [status, id]);
  }

  public async setWebHookLastTx(id: number, last_tx: string): Promise<void> {
    let text = format("UPDATE %I SET last_tx = $1 WHERE id = $2;", this.webHookTable);
    await this.db.query(text, [last_tx, id]);
  }


  public async deleteWebHook(id: number): Promise<void> {
    let text = format("DELETE FROM %I WHERE id = $1;", this.webHookTable);
    let result = await this.db.query(text, [id]);
  }
}
