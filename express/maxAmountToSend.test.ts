import * as mockApi from "../generated/client/typescript-mock/api";
import { Amount } from "../generated/client/typescript-mock/model/amount";
import { SendRequest } from "../generated/client/typescript-mock/model/sendRequest";
import { SendRequestItem } from "../generated/client/typescript-mock/model/sendRequestItem";

test("Get the deposit address from a regtest wallet", async () => {
  if (!process.env.PRIVATE_WIF) {
    throw Error("Attempted to pass an empty WIF");
  } else {
    let api = new mockApi.WalletApi("http://localhost:3000/v1");
    let bobWalletReq = new mockApi.WalletRequest();
    bobWalletReq.name = "A Bobs Regtest One Time Wallet";
    bobWalletReq.type = mockApi.WalletRequest.TypeEnum.Wif;
    bobWalletReq.network = mockApi.WalletRequest.NetworkEnum.Regtest;

    let bobsWalletResp = await api.createWallet(bobWalletReq);
    const bobsWallet = bobsWalletResp.body;

    let toBob = new SendRequestItem();
    toBob.cashaddr = bobsWallet.cashaddr as string;
    toBob.amount = new Amount();
    toBob.amount.unit = Amount.UnitEnum.Sat;
    toBob.amount.value = 120000;

    let AliceSendToBobReq = new SendRequest();
    AliceSendToBobReq.walletId = `wif:regtest:${process.env.PRIVATE_WIF}`;
    AliceSendToBobReq.to = [toBob];

    await api.send(AliceSendToBobReq);

    let result = await api.maxAmountToSend({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
    });

    const resp = result.response;
    const body = result.body;

    expect(resp.statusCode).toBe(200);
    expect(body!.sat).toBeGreaterThan(110000);
  }
});
