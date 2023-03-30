import { transformContractToRequests } from "./util";

describe(`Create Contract Tests`, () => {
  test("Should transform a mainnet SendRequest", async () => {
    const sr = await transformContractToRequests({
      value: 1,
      unit: "bch",
      cashaddr: "cashaddr:this",
    });
    expect(sr[0].to).toBe("cashaddr:this");
    expect(sr[0].amount).toBe(100000000n);
  });

  test("Should transform a mainnet SendRequest", async () => {
    const sr = await transformContractToRequests([
      {
        value: 1,
        unit: "bch",
        cashaddr: "cashaddr:this",
      },
      {
        value: 2,
        unit: "bch",
        cashaddr: "cashaddr:that",
      },
    ]);
    expect(sr[0].to).toBe("cashaddr:this");
    expect(sr[0].amount).toBe(100000000n);
    expect(sr[1].to).toBe("cashaddr:that");
    expect(sr[1].amount).toBe(200000000n);
  });

  test("Should transform a mainnet SendRequest", async () => {
    const sr = await transformContractToRequests({
      amount: 100000000n,
      to: "cashaddr:this",
    });

    expect(sr[0].to).toBe("cashaddr:this");
    expect(sr[0].amount).toBe(100000000n);
  });

  test("Should transform a mainnet SendRequest", async () => {
    const sr = await transformContractToRequests([
      {
        amount: 100000000n,

        to: "cashaddr:this",
      },
      {
        amount: 200000000n,
        to: "cashaddr:that",
      },
    ]);
    expect(sr[0].to).toBe("cashaddr:this");
    expect(sr[0].amount).toBe(100000000n);
    expect(sr[1].to).toBe("cashaddr:that");
    expect(sr[1].amount).toBe(200000000n);
  });
});
