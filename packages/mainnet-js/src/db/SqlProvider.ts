import StorageProvider from "./StorageProvider";
import { WalletI } from "./interface";
import { Pool } from "pg";
import { default as format } from "pg-format";
import { TxI } from "../interface";
import { Webhook, WebhookRecurrence, WebhookType } from "../webhook/Webhook";
import { WebhookBch } from "../webhook/WebhookBch";
import { WebhookSlp } from "../webhook/WebhookSlp";
import { RegisterWebhookParams } from "../webhook/interface";
import { isCashAddress } from "../util/bchaddr";
var parseDbUrl = require("parse-database-url");

export default class SqlProvider implements StorageProvider {
  private db;
  private info;
  private walletTable: string;
  private webhookTable: string;
  private isInit = false;

  public constructor(walletTable?: string) {
    this.walletTable = walletTable ? walletTable : "wallet";
    this.webhookTable = "webhook";
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "Named wallets and webhooks require a postgres DATABASE_URL environment variable to be set"
      );
    }
    const dbConfig = parseDbUrl(process.env.DATABASE_URL);
    this.db = new Pool(dbConfig);
  }

  public async init(): Promise<StorageProvider> {
    if (!this.isInit) {
      this.isInit = true;

      let createWalletTable = format(
        "CREATE TABLE IF NOT EXISTS %I (id SERIAL, name TEXT PRIMARY KEY, wallet TEXT );",
        this.walletTable
      );
      const resWallet = await this.db.query(createWalletTable);

      let createWebhookTable = format(
        "CREATE TABLE IF NOT EXISTS %I (" +
          "id SERIAL PRIMARY KEY," +
          "cashaddr TEXT," +
          "type TEXT," +
          "recurrence TEXT," +
          "url TEXT," +
          "status TEXT," +
          "tx_seen JSON," +
          "last_height INTEGER," +
          "token_id TEXT," +
          "expires_at TIMESTAMPTZ" +
          ");",
        this.webhookTable
      );
      const resWebhook = await this.db.query(createWebhookTable);

      if (!resWallet || !resWebhook)
        throw new Error("Failed to init SqlProvider");
    }

    return this;
  }

  public async close(): Promise<StorageProvider> {
    await this.db.end();
    return this;
  }

  public getInfo(): string {
    return this.info;
  }

  public async addWallet(name: string, walletId: string): Promise<boolean> {
    let text = format(
      "INSERT into %I (name,wallet) VALUES ($1, $2);",
      this.walletTable
    );
    return await this.db.query(text, [name, walletId]);
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

  public async updateWallet(name: string, walletId: string): Promise<void> {
    let text = format(
      "UPDATE %I SET wallet = $1 WHERE name = $2;",
      this.walletTable
    );
    await this.db.query(text, [walletId, name]);
  }

  public async walletExists(name: string): Promise<boolean> {
    return (await this.getWallet(name)) !== undefined;
  }

  public async webhookFromDb(hook: Webhook) {
    // map tokenId field from postgres
    hook.tokenId = (hook as any).token_id;
    delete (hook as any).token_id;

    if (hook.type.indexOf("slp") === 0) {
      return new WebhookSlp(hook);
    } else if (isCashAddress(hook.cashaddr)) {
      return new WebhookBch(hook);
    }

    throw new Error(`Unsupported or incorrect hook address ${hook.cashaddr}`);
  }

  public async addWebhook(params: RegisterWebhookParams): Promise<Webhook> {
    // init db if it was not, useful for external api calls
    await this.init();

    params.type = params.type || WebhookType.transactionInOut;
    params.recurrence = params.recurrence || WebhookRecurrence.once;
    const expireTimeout =
      Number(process.env.WEBHOOK_EXPIRE_TIMEOUT_SECONDS) || 86400;
    params.duration_sec = params.duration_sec || expireTimeout;
    params.duration_sec =
      params.duration_sec > expireTimeout ? expireTimeout : params.duration_sec;
    params.tokenId = params.tokenId || "";

    if (params.type.indexOf("slp") === 0 && !params.tokenId) {
      throw new Error("'tokenId' parameter is required for SLP webhooks");
    }

    const expires_at = new Date(
      new Date().getTime() + params.duration_sec * 1000
    );
    let text = format(
      "INSERT into %I (cashaddr,type,recurrence,url,status,tx_seen,last_height,token_id,expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;",
      this.webhookTable
    );

    const result = await this.db.query(text, [
      params.cashaddr,
      params.type,
      params.recurrence,
      params.url,
      "",
      "[]",
      0,
      params.tokenId,
      expires_at.toISOString(),
    ]);
    const hook = await this.webhookFromDb(result.rows[0]);
    hook.db = this;
    return hook;
  }

  public async getWebhooks(): Promise<Array<Webhook>> {
    let text = format("SELECT * FROM %I", this.webhookTable);
    let result = await this.db.query(text);
    if (result) {
      const WebhookArray: Webhook[] = await Promise.all(
        result.rows.map(async (obj: any) => {
          obj = await this.webhookFromDb(obj);
          obj.db = this;
          return obj;
        })
      );
      return WebhookArray;
    } else {
      return [];
    }
  }

  public async getWebhook(id: number): Promise<Webhook | undefined> {
    const text = format("SELECT * FROM %I WHERE id = $1;", this.webhookTable);
    const result = await this.db.query(text, [id]);
    let hook = result.rows[0];
    if (hook) {
      hook = this.webhookFromDb(hook);
      hook.db = this;
    }
    return hook;
  }

  public async setWebhookStatus(id: number, status: string): Promise<void> {
    let text = format(
      "UPDATE %I SET status = $1 WHERE id = $2;",
      this.webhookTable
    );
    await this.db.query(text, [status, id]);
  }

  public async setWebhookSeenTxLastHeight(
    id: number,
    tx_seen: Array<TxI>,
    last_height: number
  ): Promise<void> {
    let text = format(
      "UPDATE %I SET tx_seen = $1, last_height = $2 WHERE id = $3;",
      this.webhookTable
    );
    await this.db.query(text, [JSON.stringify(tx_seen), last_height, id]);
  }

  public async deleteWebhook(id: number): Promise<void> {
    let text = format("DELETE FROM %I WHERE id = $1;", this.webhookTable);
    await this.db.query(text, [id]);
  }

  public async clearWebhooks(): Promise<void> {
    let text = format("DELETE FROM %I;", this.webhookTable);
    await this.db.query(text);
  }
}
