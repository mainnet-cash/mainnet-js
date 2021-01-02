const playwright = require("playwright");
const PAGE_URL = "http://localhost:8080";

describe(`Should handle contracts in the browser`, () => {
  let browser = null;
  let page = null;

  /**
   * Create the browser and page context
   */
  beforeAll(async () => {
    browser = await playwright["chromium"].launch();
    page = await browser.newPage();
    if (!page) {
      throw new Error("Connection wasn't established");
    }

    // Open the page
    await page.goto(PAGE_URL, {
      waitUntil: "networkidle0",
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  test(`Should create a random testnet wallet`, async () => {
    let params = {};
    const result = await page.evaluate(async (p) => {
      let w = await TestNetWallet.newRandom();
      return w.getDepositAddress();
    }, params);
    expect(result.slice(0, 9)).toBe("bchtest:q");
  });

  test(`Basic escrow integration test`, async () => {
    const result = await page.evaluate(
      async (args) => {
        let funder = await walletFromId(args.testnetId);

        let arbiter = await TestNetWallet.newRandom();
        let buyer = await TestNetWallet.newRandom();
        let seller = await TestNetWallet.newRandom();
        let seller2 = await TestNetWallet.newRandom();
        await funder.send([
          {
            cashaddr: buyer.getDepositAddress(),
            value: 9600,
            unit: "satoshis",
          },
        ]);
        let escrow = new EscrowContract({
          arbiterAddr: arbiter.getDepositAddress(),
          buyerAddr: buyer.getDepositAddress(),
          sellerAddr: seller.getDepositAddress(),
          amount: 5380,
        });

        // fund the escrow contract
        await buyer.sendMax(escrow.getDepositAddress());

        // spend the escrow contract
        await escrow.run(buyer.privateKeyWif, "spend");

        // spend the sellers funds to another wallet
        await seller.sendMax(seller2.getDepositAddress());
        return await seller2.getBalance("sat");
      },
      { testnetId: process.env.ALICE_TESTNET_WALLET_ID }
    );
    expect(result).toBeGreaterThan(1);
  });
});
