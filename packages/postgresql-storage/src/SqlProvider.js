import { getSslConfig } from "./util.js";
import parseDbUrl from "parse-database-url";
import pg from "pg";
import format from "pg-format";
import { WebhookRecurrence, WebhookType } from "./webhook/index.js";
export default class SqlProvider {
    constructor(walletTable) {
        this.webhookTable = "webhook";
        this.isInit = false;
        this.walletTable = walletTable ? walletTable : "wallet";
        if (!process.env.DATABASE_URL) {
            throw new Error("Named wallets and webhooks require a postgres DATABASE_URL environment variable to be set");
        }
        let dbConfig = parseDbUrl(process.env.DATABASE_URL);
        let ssl = getSslConfig();
        if (ssl) {
            dbConfig.ssl = ssl;
        }
        this.config = dbConfig;
        const Pool = pg.Pool;
        this.db = new Pool(dbConfig);
        this.formatter = format;
    }
    getConfig() {
        return this.config;
    }
    async init() {
        if (!this.isInit) {
            this.isInit = true;
            await this.db;
            await this.formatter;
            let createWalletTable = this.formatter("CREATE TABLE IF NOT EXISTS %I (id SERIAL, name TEXT PRIMARY KEY, wallet TEXT );", this.walletTable);
            const resWallet = await this.db.query(createWalletTable);
            let createWebhookTable = this.formatter("CREATE TABLE IF NOT EXISTS %I (" +
                "id SERIAL PRIMARY KEY," +
                "cashaddr TEXT," +
                "type TEXT," +
                "recurrence TEXT," +
                "url TEXT," +
                "status TEXT," +
                "tx_seen JSON," +
                "last_height INTEGER," +
                "expires_at TIMESTAMPTZ" +
                ");", this.webhookTable);
            const resWebhook = await this.db.query(createWebhookTable);
            if (!resWallet || !resWebhook)
                throw new Error("Failed to init SqlProvider");
        }
        return this;
    }
    async close() {
        await this.db.end();
        return this;
    }
    getInfo() {
        return this.info;
    }
    async addWallet(name, walletId) {
        let text = this.formatter("INSERT into %I (name,wallet) VALUES ($1, $2);", this.walletTable);
        return await this.db.query(text, [name, walletId]);
    }
    async getWallets() {
        let text = this.formatter("SELECT * FROM %I;", this.walletTable);
        let result = await this.db.query(text);
        if (result) {
            const WalletArray = await Promise.all(result.rows.map(async (obj) => {
                return obj;
            }));
            return WalletArray;
        }
        else {
            return [];
        }
    }
    async getWallet(name) {
        let text = this.formatter("SELECT * FROM %I WHERE name = $1;", this.walletTable);
        let result = await this.db.query(text, [name]);
        let w = result.rows[0];
        return w;
    }
    async updateWallet(name, walletId) {
        let text = this.formatter("UPDATE %I SET wallet = $1 WHERE name = $2;", this.walletTable);
        await this.db.query(text, [walletId, name]);
    }
    async walletExists(name) {
        return (await this.getWallet(name)) !== undefined;
    }
    async webhookFromDb(hook) {
        const { WebhookBch } = await import("./webhook/WebhookBch.js");
        return new WebhookBch(hook);
    }
    async addWebhook(params) {
        // init db if it was not, useful for external api calls
        await this.init();
        params.type = params.type || WebhookType.transactionInOut;
        params.recurrence = params.recurrence || WebhookRecurrence.once;
        const expireTimeout = Number(process.env.WEBHOOK_EXPIRE_TIMEOUT_SECONDS) || 86400;
        params.duration_sec = params.duration_sec || expireTimeout;
        params.duration_sec =
            params.duration_sec > expireTimeout ? expireTimeout : params.duration_sec;
        const expires_at = new Date(new Date().getTime() + params.duration_sec * 1000);
        let text = this.formatter("INSERT into %I (cashaddr,type,recurrence,url,status,tx_seen,last_height,expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;", this.webhookTable);
        const result = await this.db.query(text, [
            params.cashaddr,
            params.type,
            params.recurrence,
            params.url,
            "",
            "[]",
            0,
            expires_at.toISOString(),
        ]);
        const hook = await this.webhookFromDb(result.rows[0]);
        hook.db = this;
        return hook;
    }
    async getWebhooks() {
        let text = this.formatter("SELECT * FROM %I;", this.webhookTable);
        let result = await this.db.query(text);
        if (result) {
            const WebhookArray = await Promise.all(result.rows.map(async (obj) => {
                obj = await this.webhookFromDb(obj);
                obj.db = this;
                return obj;
            }));
            return WebhookArray;
        }
        else {
            return [];
        }
    }
    async getWebhook(id) {
        const text = this.formatter("SELECT * FROM %I WHERE id = $1;", this.webhookTable);
        const result = await this.db.query(text, [id]);
        let hook = result.rows[0];
        if (hook) {
            hook = this.webhookFromDb(hook);
            hook.db = this;
        }
        return hook;
    }
    async setWebhookStatus(id, status) {
        let text = this.formatter("UPDATE %I SET status = $1 WHERE id = $2;", this.webhookTable);
        await this.db.query(text, [status, id]);
    }
    async setWebhookSeenTxLastHeight(id, tx_seen, last_height) {
        let text = this.formatter("UPDATE %I SET tx_seen = $1, last_height = $2 WHERE id = $3;", this.webhookTable);
        await this.db.query(text, [JSON.stringify(tx_seen), last_height, id]);
    }
    async deleteWebhook(id) {
        let text = this.formatter("DELETE FROM %I WHERE id = $1;", this.webhookTable);
        await this.db.query(text, [id]);
    }
    async clearWebhooks() {
        let text = this.formatter("DELETE FROM %I;", this.webhookTable);
        await this.db.query(text);
    }
    async getFaucetQueue() {
        let text = this.formatter("SELECT * FROM %I;", this.faucetQueueTable);
        let result = await this.db.query(text);
        if (result) {
            const FaucetQueueItemArray = await Promise.all(result.rows.map(async (obj) => {
                return obj;
            }));
            return FaucetQueueItemArray;
        }
        else {
            return [];
        }
    }
    async deleteFaucetQueueItems(items) {
        const ids = items.map((val) => val.id);
        let text = this.formatter("DELETE FROM %I WHERE id IN (%L);", this.faucetQueueTable, ids);
        let result = await this.db.query(text);
        return result;
    }
    async beginTransaction() {
        return await this.db.query("BEGIN");
    }
    async commitTransaction() {
        return await this.db.query("COMMIT");
    }
    async rollbackTransaction() {
        return await this.db.query("ROLLBACK");
    }
}
//# sourceMappingURL=SqlProvider.js.map