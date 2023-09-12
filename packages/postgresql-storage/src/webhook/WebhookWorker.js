import SqlProvider from "../SqlProvider.js";
export default class WebhookWorker {
    constructor() {
        this.activeHooks = new Map();
        this.callbacks = new Map();
        this.checkInterval = undefined;
        this.db = new SqlProvider();
    }
    static async instance() {
        if (!WebhookWorker._instance) {
            WebhookWorker._instance = new WebhookWorker();
            await WebhookWorker._instance.init();
        }
        return WebhookWorker._instance;
    }
    async init() {
        await this.db.init();
        await this.evictOldHooks();
        await this.pickupHooks(true);
        if (!this.checkInterval) {
            this.checkInterval = setInterval(async () => {
                await this.evictOldHooks();
                await this.pickupHooks(true);
            }, 5 * 60 * 1000);
        }
    }
    async destroy() {
        await this.stopAll();
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = undefined;
        }
    }
    async pickupHooks(start = false) {
        const hooks = await this.db.getWebhooks();
        for (const hook of hooks) {
            if (!this.activeHooks.has(hook.id)) {
                this.activeHooks.set(hook.id, hook);
                if (start) {
                    await hook.start();
                }
            }
        }
    }
    async evictOldHooks() {
        const now = new Date();
        const dbHooks = await this.db.getWebhooks();
        for (const hook of dbHooks) {
            if (now >= hook.expires_at) {
                // console.debug("Evicting expired hook with id", hook.id, new Date(), hook.expires_at);
                if (this.activeHooks.has(hook.id)) {
                    await this.stopHook(hook);
                }
                await this.db.deleteWebhook(hook.id);
            }
        }
    }
    async registerWebhook(params, start = true) {
        const webhook = await this.db.addWebhook(params);
        if (start) {
            this.activeHooks.set(webhook.id, webhook);
            await webhook.start();
        }
        return webhook.id;
    }
    async getWebhook(id) {
        if (this.activeHooks.has(id)) {
            return this.activeHooks.get(id);
        }
        return await this.db.getWebhook(id);
    }
    async deleteWebhook(id) {
        if (this.activeHooks.has(id)) {
            await this.stopHook(this.activeHooks.get(id));
        }
        await this.db.deleteWebhook(id);
    }
    async deleteAllWebhooks() {
        await this.stopAll();
        await this.db.clearWebhooks();
    }
    async stopAll() {
        for (const [, hook] of this.activeHooks) {
            await this.stopHook(hook);
        }
    }
    async stopHook(hook) {
        if (this.activeHooks.has(hook.id)) {
            await hook.stop();
            this.activeHooks.delete(hook.id);
        }
    }
}
//# sourceMappingURL=WebhookWorker.js.map