import * as mockApi from "../../generated/client/typescript-mock/api";

test("Create a Regtest wallet form the API", async () => {
  let req = new mockApi.WalletRequest();
  req.name = "A simple Regtest Wallet";
  req.type = mockApi.WalletRequest.TypeEnum.Wif;
  req.network = mockApi.WalletRequest.NetworkEnum.Regtest;
  let api = new mockApi.WalletApi("http://localhost:3000/v1");
  let result = await api.createWallet(req);
  const resp = result.response;
  const body = result.body;
  expect(resp.statusCode).toBe(200);
  expect(body!.name).toBe(req.name);
  expect(body!.network).toBe(req.network);
  expect(body!.cashaddr!.startsWith("bchreg:")).toBeTruthy();
  expect(body!.walletId!.startsWith("wif:regtest:3")).toBeTruthy();
});

test("Create a Testnet wallet with the API", async () => {
  let req = new mockApi.WalletRequest();
  req.name = "A simple Testnet Wallet";

  req.type = mockApi.WalletRequest.TypeEnum.Wif;
  req.network = mockApi.WalletRequest.NetworkEnum.Testnet;

  let api = new mockApi.WalletApi("http://localhost:3000/v1");
  let result = await api.createWallet(req);
  const resp = result.response;
  const body = result.body;
  expect(resp.statusCode).toBe(200);
  expect(body!.name).toBe(req.name);
  expect(body!.network).toBe(req.network);
  expect(body!.cashaddr!.startsWith("bchtest:")).toBeTruthy();
  expect(body!.walletId!.startsWith("wif:testnet:3")).toBeTruthy();
});

test("Create a Mainnet wallet with the API", async () => {
  let req = new mockApi.WalletRequest();
  req.name = "A simple Mainnet Wallet";
  req.type = mockApi.WalletRequest.TypeEnum.Wif;
  req.network = mockApi.WalletRequest.NetworkEnum.Mainnet;

  let api = new mockApi.WalletApi("http://localhost:3000/v1");
  let result = await api.createWallet(req);
  const resp = result.response;
  const body = result.body;

  expect(resp.statusCode).toBe(200);
  expect(body!.name).toBe(req.name);
  expect(body!.network).toBe(req.network);
  expect(body!.cashaddr!.startsWith("bitcoincash:")).toBeTruthy();
  expect(body!.walletId!.startsWith("wif:mainnet:2")).toBeTruthy();
});
