import { WebHook } from "./interface";

/**
 * @jest-environment jsdom
 */
test("Test WebHook interface", async () => {
  let webHook = new WebHook({
    address: "bchtest:kek",
    type: "transaction:in",
    recurrence: "once",
    hook_url: "http://example.com",
  });
  console.log(webHook.hash);
});
