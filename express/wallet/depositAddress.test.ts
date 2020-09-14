import * as mockApi from "../../generated/client/typescript-mock/api";

test("Get the deposit address from a regtest wallet", async () => {
  let api = new mockApi.WalletApi("http://localhost:3000/v1");
  let result = await api.depositAddress({
    walletId:
      "wif:regtest:3h4GVWszSE9WD4WUoQCGtphK1XMS8771ZmABfeGWc44iZbSna5D7Yi",
  });
  const resp = result.response;
  const body = result.body;
  expect(resp.statusCode).toBe(200);
  expect(body!.cashaddr).toBe(
    "bchreg:qp3t43vq3xnxdfuge4l4q4ndehkn48uexghagrwwx5"
  );
});
