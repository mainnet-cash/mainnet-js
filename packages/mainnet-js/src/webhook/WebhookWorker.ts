import SqlProvider from "../db/SqlProvider.js";
import { RegisterWebhookParams } from "./interface.js";

import { Webhook } from "./Webhook";

export default class WebhookWorker {
  activeHooks: Map<number, Webhook> = new Map();
  callbacks: Map<number, (data: any | string | Array<string>) => void> =
    new Map();
  db: SqlProvider;
  checkInterval: any = undefined;

  private static _instance: WebhookWorker;

  static async instance() {
    if (!WebhookWorker._instance) {
      WebhookWorker._instance = new WebhookWorker();
      await WebhookWorker._instance.init();
    }

    return WebhookWorker._instance;
  }

  constructor() {
    this.db = new SqlProvider();
  }

  async init(): Promise<void> {
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

  async destroy(): Promise<void> {
    await this.stopAll();
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  async pickupHooks(start: boolean = false): Promise<void> {
    const hooks: Webhook[] = await this.db.getWebhooks();
    for (const hook of hooks) {
      if (!this.activeHooks.has(hook.id!)) {
        this.activeHooks.set(hook.id!, hook);
        if (start) {
          await hook.start();
        }
      }
    }
  }

  async evictOldHooks(): Promise<void> {
    const now = new Date();
    const dbHooks = await this.db.getWebhooks();
    for (const hook of dbHooks) {
      if (now >= hook.expires_at) {
        // console.debug("Evicting expired hook with id", hook.id, new Date(), hook.expires_at);
        if (this.activeHooks.has(hook.id!)) {
          await this.stopHook(hook);
        }
        await this.db.deleteWebhook(hook.id!);
      }
    }
  }

  async registerWebhook(
    params: RegisterWebhookParams,
    start: boolean = true
  ): Promise<number> {
    const webhook = await this.db.addWebhook(params);
    if (start) {
      this.activeHooks.set(webhook.id!, webhook);
      await webhook.start();
    }
    return webhook.id!;
  }

  async getWebhook(id: number): Promise<Webhook | undefined> {
    if (this.activeHooks.has(id)) {
      return this.activeHooks.get(id)!;
    }

    return await this.db.getWebhook(id);
  }

  async deleteWebhook(id: number): Promise<void> {
    if (this.activeHooks.has(id)) {
      await this.stopHook(this.activeHooks.get(id)!);
    }
    await this.db.deleteWebhook(id);
  }

  async deleteAllWebhooks(): Promise<void> {
    await this.stopAll();
    await this.db.clearWebhooks();
  }

  async stopAll(): Promise<void> {
    for (const [, hook] of this.activeHooks) {
      await this.stopHook(hook);
    }
  }

  async stopHook(hook: Webhook): Promise<void> {
    if (this.activeHooks.has(hook.id!)) {
      await hook.stop();
      this.activeHooks.delete(hook.id!);
    }
  }
}
