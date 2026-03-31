import { Webhook } from "./Webhook.js";

describe("Webhook worker tests", () => {
  test("Test creating hook", async () => {
    const hook = new Webhook({ cashaddr: "asdf" });
    expect(hook.cashaddr).toBe("asdf");
    expect(hook.type).toBe(undefined);
  });
});
