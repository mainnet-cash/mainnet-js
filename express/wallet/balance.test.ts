import * as mockApi from "../../generated/client/typescript-mock/api";

test("Get the deposit address from a regtest wallet", async () => {
  if (!process.env.PRIVATE_WIF) {
    throw Error("Attempted to pass an empty WIF");
  } else {
    let api = new mockApi.WalletApi("http://localhost:3000/v1");
    let result = await api.balance({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
    });

    const resp = result.response;
    const body = result.body;

    expect(resp.statusCode).toBe(200);
    expect(body!.sat).toBeGreaterThan(100);
    expect(body!.bch).toBeGreaterThan(100);
  }
});
