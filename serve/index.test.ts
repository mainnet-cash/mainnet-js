import * as mockApi from "../client/typescript-mock/api";

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
  expect(body?.name).toBe(req.name);
  expect(body?.type).toBe(req.type);
  expect(body?.network).toBe(req.network);
  expect(body?.cashaddress?.startsWith("bchreg:")).toBeTruthy();
  expect(body?.wallet?.startsWith("wif:bchreg:3")).toBeTruthy();
});

test("Create a Testnet wallet form the API", async () => {
  let req = new mockApi.WalletRequest();
  req.name = "A simple Testnet Wallet";
  req.type = mockApi.WalletRequest.TypeEnum.Wif;
  req.network = mockApi.WalletRequest.NetworkEnum.Testnet;

  let api = new mockApi.WalletApi("http://localhost:3000/v1");
  let result = await api.createWallet(req);
  const resp = result.response;
  const body = result.body;
  expect(resp.statusCode).toBe(200);
  expect(body?.name).toBe(req.name);
  expect(body?.type).toBe(req.type);
  expect(body?.network).toBe(req.network);
  expect(body?.cashaddress?.startsWith("bchtest:")).toBeTruthy();
  expect(body?.wallet?.startsWith("wif:bchtest:3")).toBeTruthy();
});


