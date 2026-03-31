import { Webhook } from "./Webhook.js";

const origPost = Webhook.prototype.post;
export const responses: Record<string, Array<{ status: number }>> = {};

export function setupWebhookMock() {
  Webhook.prototype.post = async function (data: any): Promise<boolean> {
    const url = this.url;
    const status = url === "http://example.com/fail" ? 503 : 200;
    if (url in responses) {
      responses[url].push({ status });
    } else {
      responses[url] = [{ status }];
    }
    return status === 200;
  };
}

export function resetWebhookMock() {
  for (const key of Object.keys(responses)) {
    delete responses[key];
  }
}

export function teardownWebhookMock() {
  resetWebhookMock();
  Webhook.prototype.post = origPost;
}
