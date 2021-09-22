
var mainnet = require("mainnet-js");
var server = require("../")
var request = require("supertest");
var app;

describe("Test Wallet Slp Endpoints", () => {
  beforeAll(async function () {
    app = await server.getServer().launch();
  });
  afterAll(async function () {
    await server.killElectrum()
    app.close();
  });

  /**
   * utilDecodeTransaction
   */
   it("Should decode a bitcoin transaction", async () => {
    const utxoResponse = await request(app)
      .post("/wallet/utxo")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      });

    const utxo = utxoResponse.body.utxos[0];

    const resp = await request(app)
      .post("/wallet/util/decode_transaction")
      .send({
        network: "mainnet",
        transactionHashOrHex: "36a3692a41a8ac60b73f7f41ee23f5c917413e5b2fad9e44b34865bd0d601a3d",
        loadInputValues: true
      });

    expect(resp.status).toBe(200);
    expect(resp.body.txid).toBe("36a3692a41a8ac60b73f7f41ee23f5c917413e5b2fad9e44b34865bd0d601a3d");

    // should fail on non-existent transaction
    const fail1 = await request(app)
      .post("/wallet/util/decode_transaction")
      .send({
        network: "regtest",
        transactionHashOrHex: "36a3692a41a8ac60b73f7f41ee23f5c917413e5b2fad9e44b34865bd0d601a3d"
      });

    expect(fail1.status).toBe(405);
    expect(fail1.body.message).toContain("might not exist");

    // should fail lookup, network implied is mainnet, tx exists in regtest
    const fail2 = await request(app)
      .post("/wallet/util/decode_transaction")
      .send({
        transactionHashOrHex: utxo.txId
      });

    expect(fail2.status).toBe(405);
    expect(fail2.body.message).toContain("might not exist");

    // should fail on invalid tx hash
    const fail3 = await request(app)
      .post("/wallet/util/decode_transaction")
      .send({
        network: "regtest",
        transactionHashOrHex: "test"
      });

    expect(fail3.status).toBe(405);
    expect(fail3.body.message).toContain("Invalid tx hash");
  });
});
