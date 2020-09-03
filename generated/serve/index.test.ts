import * as mockApi from "../client/typescript-mock/api";
import { SendRequest } from "../client/typescript-mock/model/sendRequest"
import { SendRequestItem } from "../client/typescript-mock/model/sendRequestItem"
import { Amount } from "../client/typescript-mock/model/amount"

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
  expect(body?.network).toBe(req.network);
  expect(body?.cashaddr?.startsWith("bchreg:")).toBeTruthy();
  expect(body?.walletId?.startsWith("wif:bchreg:3")).toBeTruthy();
});


test("Send from a Regtest wallet with the API", async () => {
  if (!process.env.PRIVATE_WIF) {
    throw Error("Attempted to pass an empty WIF");
  } else {
    let api = new mockApi.WalletApi("http://localhost:3000/v1");

    let bobWalletReq = new mockApi.WalletRequest();
    bobWalletReq.type = mockApi.WalletRequest.TypeEnum.Wif;
    bobWalletReq.network = mockApi.WalletRequest.NetworkEnum.Regtest;
    
    let result = await api.createWallet(bobWalletReq);
    const bobResp = result.body;

    let bobsAddress = bobResp.cashaddr as string

    let sendToBobReq = new SendRequest();
    sendToBobReq.walletId = `wif:regtest:${process.env.PRIVATE_WIF}`;

    let toBob = new SendRequestItem()
    toBob.cashaddr = bobsAddress
    toBob.unit = Amount.UnitEnum.Sats
    toBob.value = 1000
    sendToBobReq.to = [toBob]
    
    let sendResult = await api.send([sendToBobReq])

    const resp = sendResult.response;
    const body = sendResult.body;
    expect(resp.statusCode).toBe(200);
    expect((body.transaction as string).length).toBe(65);
  


    //let infoApi = new mockApi.InfoApi("http://localhost:3000/v1")
  }
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
  console.log({...body})
  expect(resp.statusCode).toBe(200);
  expect(body?.name).toBe(req.name);
  expect(body?.network).toBe(req.network);
  expect(body?.cashaddr?.startsWith("bchreg:")).toBeTruthy();
  expect(body?.walletId?.startsWith("wif:bchreg:3")).toBeTruthy();
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
  expect(body?.name).toBe(req.name);
  expect(body?.network).toBe(req.network);
  expect(body?.cashaddr?.startsWith("bitcoincash:")).toBeTruthy();
  expect(body?.walletId?.startsWith("wif:bitcoincash:2")).toBeTruthy();
});
