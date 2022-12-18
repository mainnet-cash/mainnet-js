import server from "..";
import request from "supertest";
import { BigNumber } from "@ethersproject/bignumber";

var app;

function checkStatus(resp) {;
  if (resp.statusCode !== 200) {
    throw resp.body;
  }
}

describe.skip("Test SmartBch Contract Services", () => {

  beforeAll(async function () {
    app = await server.getServer().launch();
  });
  afterAll(async function () {
    await server.killElectrum()
    app.close();
  });

/**
   * Test creating contract and getting info
   */
 it("Should create a contract and return info", async () => {
    const address = "0xdac17f958d2ee523a2206206994597c13d831ec7";
    const abi = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
    ];
    const network = "regtest";

    const contractResp = await request(app).post("/smartbch/contract/create").send({
      address: address,
      abi: abi,
      network: network
    });

    checkStatus(contractResp);
    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId).toMatch(/smartbchcontract:regtest:\w+/);
    expect(contractResp.body.address).toMatch(/0x/);

    const contractInfoResp = await request(app).post("/smartbch/contract/info").send({
      contractId: contractResp.body.contractId
    });

    checkStatus(contractInfoResp);
    expect(contractInfoResp.statusCode).toEqual(200);
    expect(contractInfoResp.body.contractId).toBe(contractResp.body.contractId);
    expect(contractInfoResp.body.abi).toStrictEqual(abi);
    expect(contractInfoResp.body.address).toMatch(/0x/);
    expect(contractInfoResp.body.script).toBe("");
    expect(contractInfoResp.body.parameters).toStrictEqual([]);
  });

  it("Should deploy a contract and return info, estimate gas and invoke functions", async () => {
    const walletId = process.env.SBCH_ALICE_ID;
    const script = `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.2;

    import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

    contract MyToken is ERC20 {
      constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 10000);
      }
    }`;
    const parameters = ["MyToken", "MTK"];
    const overrides = { gasPrice: 10 ** 10 };

    const contractResp = await request(app).post("/smartbch/contract/deploy").send({
      walletId: walletId,
      script: script,
      parameters: parameters,
      overrides: overrides
    });

    checkStatus(contractResp);
    expect(contractResp.body.contractId).toMatch(/smartbchcontract:regtest:0x/);
    expect(contractResp.body.address).toMatch(/0x/);
    expect(contractResp.body.txId).toMatch(/0x/);
    expect(contractResp.body.receipt).toBeDefined();
    expect(contractResp.body.receipt.transactionHash).toMatch(/0x/);

    const contractInfoResp = await request(app).post("/smartbch/contract/info").send({
      contractId: contractResp.body.contractId
    });

    checkStatus(contractInfoResp);
    expect(contractInfoResp.statusCode).toEqual(200);
    expect(contractInfoResp.body.contractId).toBe(contractResp.body.contractId);
    expect(contractInfoResp.body.abi).toBeDefined();
    expect(contractInfoResp.body.abi.length).toBeGreaterThan(0);
    expect(contractInfoResp.body.address).toMatch(/0x/);
    expect(contractInfoResp.body.script).toBe(script);
    expect(contractInfoResp.body.parameters).toStrictEqual(parameters);

    // "estimateGas" on const call
    const constGasResponse = await request(app).post("/smartbch/contract/estimate_gas").send({
      contractId: contractInfoResp.body.contractId,
      function: "decimals",
      arguments: undefined,
      overrides: undefined
    });
    checkStatus(constGasResponse);
    const constGas = BigNumber.from(constGasResponse.body.gas);
    expect(constGas).toStrictEqual(BigNumber.from(0));

    // "decimals" const call
    let constReplyResponse = await request(app).post("/smartbch/contract/call").send({
      walletId: undefined,
      contractId: contractInfoResp.body.contractId,
      function: "decimals",
      arguments: undefined,
      overrides: undefined
    });
    checkStatus(constReplyResponse);
    const constReply = constReplyResponse.body;
    expect(constReply.result).toBe(18);

    // prepare "transfer" call
    const to = contractResp.body.address;
    const value = 10000;
    // const overrides = { gasPrice: 10 ** 10 };

    // "estimateGas" on state-changing call
    const txGasResponse = await request(app).post("/smartbch/contract/estimate_gas").send({
      walletId: walletId,
      contractId: contractInfoResp.body.contractId,
      function: "transfer",
      arguments: [to, value],
      overrides: overrides
    });
    checkStatus(txGasResponse);
    const txGas = BigNumber.from(txGasResponse.body.gas);
    expect(txGas.toNumber()).toBeGreaterThan(0);

    // "transfer" call
    let txReplyResponse = await request(app).post("/smartbch/contract/call").send({
      walletId: walletId,
      contractId: contractInfoResp.body.contractId,
      function: "transfer",
      arguments: [to, value],
      overrides: overrides
    });
    checkStatus(txReplyResponse);

    const txReply = txReplyResponse.body;
    expect(txReply.txId.length).toBe(66);
    expect(txReply.receipt.transactionHash.length).toBe(66);
  });
});