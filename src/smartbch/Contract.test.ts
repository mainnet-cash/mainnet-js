import { Contract } from "../smartbch/Contract";

describe(`Test Ethereum functions`, () => {
  test("Test contract", async () => {
    const abi = [
      // Some details about the token
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",

      // Get the account balance
      "function balanceOf(address) view returns (uint)",

      // Send some of your tokens to someone else
      "function transfer(address to, uint amount)",

      // An event triggered whenever anyone transfers to someone else
      "event Transfer(address indexed from, address indexed to, uint amount)"
    ];

    const a = new Contract("0xdac17f958d2ee523a2206206994597c13d831ec7", abi, [1,"a"]);
    console.log(await a.getBalance("0x227F0226499E308769478669669CbdCf4E7dA002"));

    const contractId = a.toString();

    const cont = Contract.fromId(contractId);
    delete (cont as any).provider; delete (cont as any).contract;
    delete (a as any).provider; delete (a as any).contract;
    expect(JSON.stringify(cont)).toEqual(JSON.stringify(a));
  });
});