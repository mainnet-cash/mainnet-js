import { allocateFee, sortSendRequests } from "./allocateFee";
import { FeePaidByEnum } from "../wallet/enum";
import { asSendRequestObject } from "../util/asSendRequestObject";
import { SendRequest, disconnectProviders, initProviders } from "..";
import { RegTestWallet } from "../wallet/Wif";

beforeAll(async () => {
  await initProviders();
});

afterAll(async () => {
  await disconnectProviders();
});

describe("Fee tests", () => {
  test("Should get the regtest wallet balance", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.ADDRESS) {
      throw Error("Attempted to pass an empty address");
    } else {
      const funder = await RegTestWallet.fromId(
        `wif:regtest:${process.env.PRIVATE_WIF!}`
      );
      const alice = await RegTestWallet.newRandom();
      const bob = await RegTestWallet.newRandom();
      const charlie = await RegTestWallet.newRandom();
      const dave = await RegTestWallet.newRandom();
      const edward = await RegTestWallet.newRandom();
      await funder.send([
        {
          cashaddr: alice.cashaddr!,
          value: 4500,
          unit: "satoshis",
        },
      ]);
      await alice.send(
        [
          {
            cashaddr: bob.cashaddr!,
            unit: "sat",
            value: 549,
          },
          {
            cashaddr: charlie.cashaddr!,
            unit: "sat",
            value: 550,
          },
          {
            cashaddr: dave.cashaddr!,
            unit: "sat",
            value: 551,
          },
          {
            cashaddr: edward.cashaddr!,
            unit: "sat",
            value: 2552,
          },
        ],
        { feePaidBy: FeePaidByEnum.changeThenAny }
      );
      expect(await alice.getBalance("sat")).toBe(0);
      expect(await bob.getBalance("sat")).toBe(0);
      expect(await charlie.getBalance("sat")).toBe(550);
      expect(await dave.getBalance("sat")).toBe(551);
      expect(await edward.getBalance("sat")).toBe(2552);
    }
  });

  test("Expect first in to subtract fee from first", async () => {
    let to = [
      ["alice", 2000, "sat"],
      ["bob", 2000, "sat"],
    ];
    let fee = 1;
    let requests = asSendRequestObject(to) as SendRequest[];
    let allocatedInputs = await allocateFee(
      requests,
      fee,
      FeePaidByEnum.first,
      BigInt(0)
    );
    expect(allocatedInputs[0].value).toBeLessThan(2000);
    expect(allocatedInputs[1].value).toBe(2000);
  });

  test("Expect last to subtract fee from last", async () => {
    let to = [
      ["alice", 2000, "sat"],
      ["bob", 2000, "sat"],
    ];
    let fee = 1;
    let requests = asSendRequestObject(to) as SendRequest[];
    let allocatedInputs = allocateFee(
      requests,
      fee,
      FeePaidByEnum.last,
      BigInt(0)
    );

    expect(allocatedInputs[0].value).toBe(2000);
    expect(allocatedInputs[1].value).toBeLessThan(2000);
  });

  test("Expect all to allocate fees equally", async () => {
    let to = [
      ["alice", 2000, "sat"],
      ["bob", 2000, "sat"],
      ["charlie", 2000, "sat"],
    ];
    let fee = 3;
    let requests = asSendRequestObject(to) as SendRequest[];

    let allocatedInputs = allocateFee(
      requests,
      fee,
      FeePaidByEnum.any,
      BigInt(0)
    );

    expect(allocatedInputs[0].value).toBe(1999);
    expect(allocatedInputs[1].value).toBe(1999);
    expect(allocatedInputs[2].value).toBe(1999);
  });

  test("Expect all to allocate fees equally, taking dust result", async () => {
    let to = [
      ["alice", 2000, "sat"],
      ["bob", 547, "sat"],
      ["charlie", 2000, "sat"],
    ];
    let fee = 300;
    let requests = asSendRequestObject(to) as SendRequest[];

    let allocatedInputs = allocateFee(
      requests,
      fee,
      FeePaidByEnum.any,
      BigInt(0)
    );

    expect(allocatedInputs[0].value).toBe(2000);
    expect(allocatedInputs[1].value).toBe(2000);
    expect(allocatedInputs.length).toBe(2);
  });

  test("Expect all to allocate fees equally, taking dust result output, dividing remainder", async () => {
    let to = [
      ["alice", 2000, "sat"],
      ["bob", 547, "sat"],
      ["charlie", 2000, "sat"],
    ];
    let fee = 647;
    let requests = asSendRequestObject(to) as SendRequest[];

    let allocatedInputs = allocateFee(
      requests,
      fee,
      FeePaidByEnum.any,
      BigInt(0)
    );

    expect(allocatedInputs[0].value).toBe(1950);
    expect(allocatedInputs[1].value).toBe(1950);
    expect(allocatedInputs.length).toBe(2);
  });

  test("Expect an odd fee to be applied to have remainder applied to first receipt", async () => {
    let to = [
      ["alice", 2000, "sat"],
      ["bob", 2000, "sat"],
      ["charlie", 2000, "sat"],
    ];
    let fee = 301;
    let requests = asSendRequestObject(to) as SendRequest[];

    let allocatedInputs = allocateFee(
      requests,
      fee,
      FeePaidByEnum.any,
      BigInt(0)
    );

    expect(allocatedInputs[0].value).toBe(1899);
    expect(allocatedInputs[1].value).toBe(1900);
    expect(allocatedInputs[2].value).toBe(1900);
  });

  test("Expect insufficient funds to error", async () => {
    expect.assertions(1);
    try {
      let to = [
        ["alice", 2000, "sat"],
        ["bob", 2000, "sat"],
        ["charlie", 2000, "sat"],
      ];
      let fee = 7000;
      let requests = asSendRequestObject(to) as SendRequest[];
      let allocatedInputs = allocateFee(
        requests,
        fee,
        FeePaidByEnum.changeThenAny,
        BigInt(999)
      );
    } catch (e: any) {
      expect(e.message).toBe("Insufficient funds for transaction given fee");
    }
  });

  test("Expect dust amounts to error", async () => {
    expect.assertions(1);
    try {
      let to = [
        ["alice", 2000, "sat"],
        ["bob", 2000, "sat"],
        ["charlie", 2000, "sat"],
      ];
      let fee = 1500;
      let requests = asSendRequestObject(to) as SendRequest[];
      let allocatedInputs = allocateFee(
        requests,
        fee,
        FeePaidByEnum.first,
        BigInt(0)
      );
    } catch (e: any) {
      expect(e.message).toBe("Fee strategy would result in dust output");
    }
  });

  test("Expect near-dust amounts not to error", async () => {
    let to = [
      ["alice", 1000, "sat"],
      ["bob", 1000, "sat"],
      ["charlie", 1000, "sat"],
    ];
    let fee = 1362;
    let requests = asSendRequestObject(to) as SendRequest[];
    let result = allocateFee(requests, fee, FeePaidByEnum.any, BigInt(0));
    expect(result[0].value).toBe(546);
    expect(result[1].value).toBe(546);
    expect(result[2].value).toBe(546);
  });

  test("Expect `any` to not consume change", async () => {
    let to = [
      ["alice", 1000, "sat"],
      ["bob", 1000, "sat"],
      ["charlie", 1000, "sat"],
    ];
    let fee = 1362;
    let requests = asSendRequestObject(to) as SendRequest[];
    let result = allocateFee(requests, fee, FeePaidByEnum.any, BigInt(1362));
    expect(result[0].value).toBe(546);
    expect(result[1].value).toBe(546);
    expect(result[2].value).toBe(546);
  });

  test("Expect `change,any` to consume only change", async () => {
    let to = [
      ["alice", 1000, "sat"],
      ["bob", 1000, "sat"],
      ["charlie", 1000, "sat"],
    ];
    let fee = 1362;
    let requests = asSendRequestObject(to) as SendRequest[];
    let result = allocateFee(
      requests,
      fee,
      FeePaidByEnum.changeThenAny,
      BigInt(1362)
    );
    expect(result[0].value).toBe(1000);
    expect(result[1].value).toBe(1000);
    expect(result[2].value).toBe(1000);
  });

  test("Expect `change,any` to use both", async () => {
    let to = [
      ["alice", 1000, "sat"],
      ["bob", 1000, "sat"],
      ["charlie", 1000, "sat"],
    ];
    let fee = 1362 * 2;
    let requests = asSendRequestObject(to) as SendRequest[];
    let result = allocateFee(
      requests,
      fee,
      FeePaidByEnum.changeThenAny,
      BigInt(1362)
    );
    expect(result[0].value).toBe(546);
    expect(result[1].value).toBe(546);
    expect(result[2].value).toBe(546);
  });

  test("Expect sortSendRequests to sort by lowest value first", async () => {
    let to = [
      ["alice", 2000, "sat"],
      ["bob", 547, "sat"],
      ["charlie", 1, "sat"],
      ["dave", 4, "sat"],
      ["edward", 6, "sat"],
      ["fred", 2000, "sat"],
      ["greg", 2000, "sat"],
      ["harry", 2000, "sat"],
    ];
    let fee = 1;
    let requests = asSendRequestObject(to) as SendRequest[];

    let result = sortSendRequests(requests);
    expect(result[0].value).toBe(1);
    expect(result[1].value).toBe(4);
    expect(result[2].value).toBe(6);
    expect(result[3].value).toBe(547);
    expect(result[4].value).toBe(2000);
    expect(result[5].value).toBe(2000);
    expect(result.length).toBe(8);
  });
});
