var _a;
import axios from "axios";
export var WebhookType;
(function (WebhookType) {
    WebhookType["transactionIn"] = "transaction:in";
    WebhookType["transactionOut"] = "transaction:out";
    WebhookType["transactionInOut"] = "transaction:in,out";
    WebhookType["balance"] = "balance";
})(WebhookType || (WebhookType = {}));
export var WebhookRecurrence;
(function (WebhookRecurrence) {
    WebhookRecurrence["once"] = "once";
    WebhookRecurrence["recurrent"] = "recurrent";
})(WebhookRecurrence || (WebhookRecurrence = {}));
export class Webhook {
    constructor(hook) {
        Object.assign(this, hook);
    }
    // abstract, empty implementation
    async start() { }
    // abstract, empty implementation
    async stop() { }
    async destroy() {
        if (this.id) {
            await this.db.deleteWebhook(this.id);
        }
    }
    async post(data) {
        try {
            await axios.post(this.url, data);
            // console.debug("Posted webhook", this.url, data);
            return true;
        }
        catch (e) {
            if (e.message && e.message.status === 200) {
                return true;
            }
            // console.debug("Failed to post webhook", this.url, e);
            return false;
        }
    }
}
//#region debug
Webhook.debug = (_a = class {
        static setupAxiosMocks() {
            axios.interceptors.request.use((config) => {
                const url = config.url;
                if (!url.startsWith("http://example.com")) {
                    return config;
                }
                let response;
                if (url === "http://example.com/fail") {
                    response = { status: 503 };
                }
                else {
                    response = { status: 200 };
                }
                if (url in this.responses) {
                    this.responses[url].push(response);
                }
                else {
                    this.responses[url] = [response];
                }
                // cancel actual http request
                return {
                    ...config,
                    cancelToken: new axios.CancelToken((cancel) => cancel(response)),
                };
            });
        }
        static reset() {
            this.responses = {};
        }
    },
    _a.responses = {},
    _a);
//# sourceMappingURL=Webhook.js.map