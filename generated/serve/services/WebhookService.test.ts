var server = require("../")
var request = require("supertest");

var app;

describe("Test Webhook Endpoints", () => {
  beforeAll(async function () {
    app = await server.getServer().launch();
  });
  afterEach(function () {
    app.close();
  });

  /**
   * balance
   */
  it("Should register a webhook", async () => {
    const resp = await request(app)
      .post("/webhook/watch_address")
      .send({
        address: 'testnet:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22',
        url: 'http://example.com/',
        type: 'balance'
      });
    expect(resp.statusCode).toEqual(200);
    expect(resp.id).toBeGreaterThan(0);
  });
});
