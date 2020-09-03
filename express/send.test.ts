import * as mockApi from "../generated/client/typescript-mock/api";
import { SendRequest } from "../generated/client/typescript-mock/model/sendRequest"
import { SendRequestItem } from "../generated/client/typescript-mock/model/sendRequestItem"
import { Amount } from "../generated/client/typescript-mock/model/amount"

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