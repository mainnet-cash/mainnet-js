import * as mockApi from "../generated/client/typescript-mock/api";

test("Get the deposit address from a regtest wallet", async () => {
  if (!process.env.PRIVATE_WIF) {
    throw Error("Attempted to pass an empty WIF");
  } else {
    let api = new mockApi.WalletApi("http://localhost:3000/v1");
    let result = await api.utxos({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
    });

    const resp = result.response;
    const body = result.body;
    if (body.utxos) {
      const valueArray = await Promise.all(
        body.utxos.map(async (b) => {
          return b?.amount?.value || 0;
        })
      );
      const value = valueArray.reduce((a, b) => a + b, 0);
      expect(resp.statusCode).toBe(200);
      expect(value).toBeGreaterThan(500 * 10e8);
      expect(body?.utxos?.length).toBeGreaterThan(100);
    } else {
      throw Error("no utxos returned");
    }
  }
});
