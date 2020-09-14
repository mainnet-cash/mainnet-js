import * as mockApi from "../../generated/client/typescript-mock/api";
import { Amount } from "../../generated/client/typescript-mock/model/amount";
import { SendRequest } from "../../generated/client/typescript-mock/model/sendRequest";
import { SendRequestItem } from "../../generated/client/typescript-mock/model/sendRequestItem";
import { SendMaxRequest } from "../../generated/client/typescript-mock/api";

test("Send from Alice to Bob, have Bob send max back", async () => {
  try {
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let api = new mockApi.WalletApi("http://localhost:3000/v1");

      let bobWalletReq = new mockApi.WalletRequest();
      bobWalletReq.name = "A Bobs Regtest Wallet";
      bobWalletReq.type = mockApi.WalletRequest.TypeEnum.Wif;
      bobWalletReq.network = mockApi.WalletRequest.NetworkEnum.Regtest;

      let bobsWalletResp = await api.createWallet(bobWalletReq);
      const bobsWallet = bobsWalletResp.body;

      let toBob = new SendRequestItem();
      toBob.cashaddr = bobsWallet.cashaddr as string;
      toBob.amount = new Amount();
      toBob.amount.unit = Amount.UnitEnum.Bch;
      toBob.amount.value = 1;

      let AliceSendToBobReq = new SendRequest();
      AliceSendToBobReq.walletId = `wif:regtest:${process.env.PRIVATE_WIF}`;
      AliceSendToBobReq.to = [toBob];

      await api.send(AliceSendToBobReq);

      let BobSendToAliceReq = new SendMaxRequest();
      BobSendToAliceReq.walletId = bobsWallet.walletId;
      BobSendToAliceReq.cashaddr = process.env.ADDRESS as string;
      let sendResult = await api.sendMax(BobSendToAliceReq);

      const resp = sendResult.response;
      const body = sendResult.body;
      expect(resp.statusCode).toBe(200);
      expect((body.transactionId as string).length).toBe(64);
      expect(body.balance!.bch as number).toBe(0);
      expect(body.balance!.sat as number).toBe(0);
    }
  } catch (e) {
    throw Error(e);
  }
});
