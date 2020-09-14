import * as mockApi from "../../generated/client/typescript-mock/api";
import { SendRequest } from "../../generated/client/typescript-mock/model/sendRequest";
import { SendRequestItem } from "../../generated/client/typescript-mock/model/sendRequestItem";
import { Amount } from "../../generated/client/typescript-mock/model/amount";
import { bchParam } from "../../src/chain";

test("Send from a Regtest wallet with the API", async () => {
  try {
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let api = new mockApi.WalletApi("http://localhost:3000/v1");

      let bobWalletReq = new mockApi.WalletRequest();
      bobWalletReq.name = "A simple Regtest Wallet";
      bobWalletReq.type = mockApi.WalletRequest.TypeEnum.Wif;
      bobWalletReq.network = mockApi.WalletRequest.NetworkEnum.Regtest;

      let bobsWalletResp = await api.createWallet(bobWalletReq);
      const bobsWallet = bobsWalletResp.body;

      let bobsAddress = bobsWallet.cashaddr as string;

      let toBob = new SendRequestItem();
      toBob.cashaddr = bobsAddress;
      toBob.amount = new Amount();
      toBob.amount.unit = Amount.UnitEnum.Sat;
      toBob.amount.value = 3000;

      let AliceSendToBobReq = new SendRequest();
      AliceSendToBobReq.walletId = `wif:regtest:${process.env.PRIVATE_WIF}`;
      AliceSendToBobReq.to = [toBob];

      let sendResult = await api.send(AliceSendToBobReq);

      const resp = sendResult.response;
      const body = sendResult.body;
      expect(resp.statusCode).toBe(200);
      expect((body.transactionId as string).length).toBe(64);
      expect(body.balance!.bch as number).toBeGreaterThan(49);
      expect(body.balance!.sat as number).toBeGreaterThan(
        50 * bchParam.subUnits
      );
    }
  } catch (e) {
    console.log(e);
    throw Error(e);
  }
});
