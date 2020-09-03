import * as mockApi from "../generated/client/typescript-mock/api";
import { SendRequest } from "../generated/client/typescript-mock/model/sendRequest"
import { SendRequestItem } from "../generated/client/typescript-mock/model/sendRequestItem"
import { Amount } from "../generated/client/typescript-mock/model/amount"

test("Send from a Regtest wallet with the API", async () => {
    try{
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
  
      let bobsAddress = bobsWallet.cashaddr as string
    
      let toBob = new SendRequestItem()
      toBob.cashaddr = bobsAddress
      toBob.amount = new Amount()
      toBob.amount.unit = Amount.UnitEnum.Sat
      toBob.amount.value = 1000

      let sendToBobReq = new SendRequest();
      sendToBobReq.walletId = `wif:regtest:${process.env.PRIVATE_WIF}`;
      sendToBobReq.to = [toBob]
      
      let sendResult = await api.send([sendToBobReq])
  
      const resp = sendResult.response;
      const body = sendResult.body;
      expect(resp.statusCode).toBe(200);
      expect((body.transaction as string).length).toBe(65);

  
      //let infoApi = new mockApi.InfoApi("http://localhost:3000/v1")
    }
} catch(e){
    console.log(e)
    throw Error(e)
}
  });