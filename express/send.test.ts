import * as mockApi from "../generated/client/typescript-mock/api";
import { SendRequest } from "../generated/client/typescript-mock/model/sendRequest";
import { SendRequestItem } from "../generated/client/typescript-mock/model/sendRequestItem";
import { Amount } from "../generated/client/typescript-mock/model/amount";
import { generateBlock } from "../src/generateBlock";
import { GrpcClient, Transaction } from "grpc-bchrpc-node";

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getBlockHeight() {
  let url = `${process.env.HOST_IP}:${process.env.GRPC_PORT}`;
  const cert = `${process.env.BCHD_BIN_DIRECTORY}/${process.env.RPC_CERT}`;
  const host = `${process.env.HOST}`;
  let client = new GrpcClient({
    url: url,
    testnet: true,
    rootCertPath: cert,
    options: {
      "grpc.ssl_target_name_override": host,
      "grpc.default_authority": host,
      "grpc.max_receive_message_length": -1,
    },
  });
  let blockchainInfo = await client.getBlockchainInfo();
  return blockchainInfo.getBestHeight();
}

beforeEach(async () => {
  for (let i = 0; (await getBlockHeight()) < 100 && i < 15; i++) {
    console.log("Waiting blocks to be mined");
    await delay(1000);
  }
});

test("Send from a Regtest wallet with the API", async () => {
  try {
    generateBlock(
      process.env.RPC_USER || "alice",
      process.env.RPC_PASS || "password",
      1,
      process.env.BCHD_BIN_DIRECTORY || "bin"
    );
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
      toBob.amount.value = 1000;

      let AliceSendToBobReq = new SendRequest();
      AliceSendToBobReq.walletId = `wif:regtest:${process.env.PRIVATE_WIF}`;
      AliceSendToBobReq.to = [toBob];

      let sendResult = await api.send(AliceSendToBobReq);

      const resp = sendResult.response;
      const body = sendResult.body;
      expect(resp.statusCode).toBe(200);
      expect((body.transaction as string).length).toBe(64);
      expect(body.balance?.bch as number).toBeGreaterThan(49);
      expect(body.balance?.sat as number).toBeGreaterThan(50 * 10e8);
    }
  } catch (e) {
    console.log(e);
    throw Error(e);
  }
});
