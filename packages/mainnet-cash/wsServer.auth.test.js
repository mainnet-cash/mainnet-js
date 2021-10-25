const ws = require('ws');

const mainnet = require("mainnet-js");


const alice = process.env.ADDRESS;
const aliceSlp = alice; //mainnet.toSlpAddress(alice);
const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF}`;

let app;
const request = require("superwstest").default;



describe("Test API_KEY websocket server methods", () => {


  beforeAll(async function () {
    process.env['API_KEY'] = "test";
    config = require("./config");
    server = require("./").getServer();
    app = await server.launch();
  });

  afterAll(async function () {
    await app.close();
  });

  it("Should return 403 if wrong token is supplied", async () => {

    const aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);

    const height = await aliceWallet.provider.getBlockHeight();

    setTimeout(
      async () => await mainnet.mine({ cashaddr: aliceWallet.cashaddr, blocks: 1 }),
      2000
    );
    await request(app)
      .ws('/wallet')
      .sendJson({ method: "waitForBlock", data: { height: undefined, bearer: "wrong" }})
      .expectJson((json) => (json.code === 403))
      .close()
      .expectClosed();

  });

  it("Should return 401 and require authorization header if API_KEY env var is set", async () => {

    const aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);

    const height = await aliceWallet.provider.getBlockHeight();

    setTimeout(
      async () => await mainnet.mine({ cashaddr: aliceWallet.cashaddr, blocks: 1 }),
      2000
    );
    await request(app)
      .ws('/wallet')
      .sendJson({ method: "waitForBlock", data: { height: undefined }})
      .expectJson((json) => (json.code === 401))
      .close()
      .expectClosed();
    
  });

  

  it("Should process request with correct when API_KEY env var is set", async () => {
    const aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);

    const height = await aliceWallet.provider.getBlockHeight();

    setTimeout(
      async () => await mainnet.mine({ cashaddr: aliceWallet.cashaddr, bearer: 'test', blocks: 1 }),
      2000
    );
    await request(app)
      .ws('/wallet')
      .sendJson({ method: "waitForBlock", data: { height: undefined }})
      .expectJson((json) => (json.code === 401))
      .close()
      .expectClosed();
    
  });


});
