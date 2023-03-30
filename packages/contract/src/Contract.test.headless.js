const playwright = require("playwright");
const PAGE_URL = "http://localhost:8080/contract/index.html";

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

  test(`Should parse info from a contractId`, async () => {
    const contractId =
      "contract:regtest:T0RZc01UZ3lMREUzT0N3ek1pdzJOaXd4T0RVc01UTXNNakUwTERFeU15d3lORElzTWpVeExESTFNU3d4TlRRc01qVTFMREV5TlN3MU5Td3lOVEVzTWpNNExERTNMRE0yOk9EWXNNVGd5TERFM09Dd3pNaXcyTml3eE9EVXNNVE1zTWpFMExERXlNeXd5TkRJc01qVXhMREkxTVN3eE5UUXNNalUxTERFeU5TdzFOU3d5TlRFc01qTTRMREUzTERNMjpNVEF3:Y29udHJhY3QgVHJhbnNmZXJXaXRoVGltZW91dChieXRlczIwIHNlbmRlclBraCwgYnl0ZXMyMCByZWNpcGllbnRQa2gsIGludCB0aW1lb3V0KSB7CiAgICAgIGZ1bmN0aW9uIHRyYW5zZmVyKHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgcmVxdWlyZShoYXNoMTYwKHNpZ25pbmdQaykgPT0gcmVjaXBpZW50UGtoKTsKICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICB9CiAgCiAgICAgIGZ1bmN0aW9uIHRpbWVvdXQocHVia2V5IHNpZ25pbmdQaywgc2lnIHMpIHsKICAgICAgICAgIHJlcXVpcmUoaGFzaDE2MChzaWduaW5nUGspID09IHNlbmRlclBraCk7CiAgICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICAgICAgcmVxdWlyZSh0eC50aW1lID49IHRpbWVvdXQpOwogICAgICB9CiAgfQ==:1";
    const script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
      function transfer(pubkey signingPk, sig s) {
        require(hash160(signingPk) == recipientPkh);
        require(checkSig(s, signingPk));
      }
  
      function timeout(pubkey signingPk, sig s) {
          require(hash160(signingPk) == senderPkh);
          require(checkSig(s, signingPk));
          require(tx.time >= timeout);
      }
  }`;
    const info = await page.evaluate(async (contractId) => {
      const c = await Contract.fromId(contractId);
      return c.info();
    }, contractId);
    expect(info.cashaddr).toBe(
      "bchreg:ppt0dzpt8xmt9h2apv9r60cydmy9k0jkfg4atpnp2f"
    );
    expect(info.contractId).toBe(
      "contract:regtest:T0RZc01UZ3lMREUzT0N3ek1pdzJOaXd4T0RVc01UTXNNakUwTERFeU15d3lORElzTWpVeExESTFNU3d4TlRRc01qVTFMREV5TlN3MU5Td3lOVEVzTWpNNExERTNMRE0yOk9EWXNNVGd5TERFM09Dd3pNaXcyTml3eE9EVXNNVE1zTWpFMExERXlNeXd5TkRJc01qVXhMREkxTVN3eE5UUXNNalUxTERFeU5TdzFOU3d5TlRFc01qTTRMREUzTERNMjpNVEF3:Y29udHJhY3QgVHJhbnNmZXJXaXRoVGltZW91dChieXRlczIwIHNlbmRlclBraCwgYnl0ZXMyMCByZWNpcGllbnRQa2gsIGludCB0aW1lb3V0KSB7CiAgICAgIGZ1bmN0aW9uIHRyYW5zZmVyKHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgcmVxdWlyZShoYXNoMTYwKHNpZ25pbmdQaykgPT0gcmVjaXBpZW50UGtoKTsKICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICB9CiAgCiAgICAgIGZ1bmN0aW9uIHRpbWVvdXQocHVia2V5IHNpZ25pbmdQaywgc2lnIHMpIHsKICAgICAgICAgIHJlcXVpcmUoaGFzaDE2MChzaWduaW5nUGspID09IHNlbmRlclBraCk7CiAgICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICAgICAgcmVxdWlyZSh0eC50aW1lID49IHRpbWVvdXQpOwogICAgICB9CiAgfQ==:1"
    );
    expect(info.parameters).toStrictEqual([
      "56b6b22042b90dd67bf2fbfb9aff7d37fbee1124",
      "56b6b22042b90dd67bf2fbfb9aff7d37fbee1124",
      100,
    ]);
    expect(info.script).toBe(script);
  });

  test(`Basic escrow integration test`, async () => {
    const result = await page.evaluate(async (wif) => {
      const funder = await RegTestWallet.fromId(`wif:regtest:${wif}`);

      const arbiter = await RegTestWallet.newRandom();
      const buyer = await RegTestWallet.newRandom();
      const seller = await RegTestWallet.newRandom();
      const seller2 = await RegTestWallet.newRandom();
      await funder.send([
        {
          cashaddr: buyer.getDepositAddress(),
          value: 9600,
          unit: "satoshis",
        },
      ]);
      const escrow = new EscrowContract({
        arbiterAddr: arbiter.getDepositAddress(),
        buyerAddr: buyer.getDepositAddress(),
        sellerAddr: seller.getDepositAddress(),
        amount: 5380,
      });

      // fund the escrow contract
      await buyer.sendMax(escrow.getDepositAddress());

      // spend the escrow contract
      await escrow.call(buyer.privateKeyWif, "spend");

      // spend the sellers funds to another wallet
      await seller.sendMax(seller2.getDepositAddress());
      return await seller2.getBalance("sat");
    }, process.env.PRIVATE_WIF);
    expect(result).toBeGreaterThan(1);
  });
});
