import * as mockApi from "../client/typescript-mock/api"

test("", async () => {
    let req = new mockApi.WalletRequest()
    req.name = "A simple Regtest Wallet"
    req.type = mockApi.WalletRequest.TypeEnum.Wif
    req.network = mockApi.WalletRequest.NetworkEnum.Regtest

    let api = new mockApi.WalletApi("http://localhost:3000/v0")
    let result = await api.createWallet(req)
    const resp = result.response
    const body = result.body
    expect(resp.statusCode).toBe(200)
    expect(body?.name).toBe(req.name)
    expect(body?.type).toBe(req.type)
    expect(body?.network).toBe(req.network)
    expect(body?.cashaddress?.startsWith("bchreg:")).toBeTruthy()
    expect(body?.wallet?.startsWith("wif:bchreg:3")).toBeTruthy()
    
  });
  