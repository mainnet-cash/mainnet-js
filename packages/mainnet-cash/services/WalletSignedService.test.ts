var server = require("../")
var request = require("supertest");
var app;

describe("Test Wallet Endpoints", () => {
  beforeAll(async function () {
    app = await server.getServer().launch();
  });
  afterAll(async function () {
    await server.killElectrum()
    app.close();
  });

/**
   * sign message
   */
  it("Should return a signed message", async () => {
    const resp = await request(app)
      .post("/wallet/signed/sign")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        message: "test"
      });
     expect(resp.statusCode).toBe(200)
     expect(resp.body!.signature).toBe("IOEEiqRXRVK9gPUNpXuBjJUK47Y8XpseZejgwu59CoNSVv+3K1NkHdT64RXHP7cw4PZ6usRQ4ULrP/p5CJnrg9U=");
    
  });
  
  /**
     * verify signed message
     */
   it("Should verify a signed message", async () => {
    const resp = await request(app)
      .post("/wallet/signed/verify")
      .send({
        walletId: `watch:regtest:${process.env.ADDRESS}`,
        message: "test",
        signature: "IOEEiqRXRVK9gPUNpXuBjJUK47Y8XpseZejgwu59CoNSVv+3K1NkHdT64RXHP7cw4PZ6usRQ4ULrP/p5CJnrg9U="
      });
     expect(resp.statusCode).toBe(200)
     expect(resp.body!.valid).toBe(true);
  });
  
   /**
     * verify schnorr signed message 
     */
   it("Should verify a schnorr signed message", async () => {
    const resp = await request(app)
      .post("/wallet/signed/verify")
      .send({
        walletId: `watch:regtest:${process.env.ADDRESS}`,
        message: "test",
        signature: "8vgrWti0BItJ2wlY4s/8bT4jCNjGCLaDAoAWoj/r73Y4xiiLsU8PVVHPDB0MTnMgQzS3+rY1amLgON7lhW0EEA==",
        publicKey: "BHjUqiocZD/Gig3lRU5HxSDPWWQ1JkdOY7MgFE3p4NWa1BVOWh8oeK0vmwNs4K71d1gVVmkS43hbW3HL16PmtNo="
      });
     expect(resp.statusCode).toBe(200)
     expect(resp.body!.valid).toBe(true);
  });

});
