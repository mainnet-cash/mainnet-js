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
          value: 4500n,
        },
      ]);
      await alice.send(
        [
          {
            cashaddr: bob.cashaddr!,
            value: 549n,
          },
          {
            cashaddr: charlie.cashaddr!,
            value: 550n,
          },
          {
            cashaddr: dave.cashaddr!,
            value: 551n,
          },
          {
            cashaddr: edward.cashaddr!,
            value: 2552n,
          },
        ],
        { feePaidBy: FeePaidByEnum.changeThenAny }
      );
      expect(await alice.getBalance("sat")).toBe(0n);
      expect(await bob.getBalance("sat")).toBe(0n);
      expect(await charlie.getBalance("sat")).toBe(550n);
      expect(await dave.getBalance("sat")).toBe(551n);
      expect(await edward.getBalance("sat")).toBe(2552n);
    }
  });

  test("Expect first in to subtract fee from first", async () => {
    let to = [
      ["alice", 2000n],
      ["bob", 2000n],
    ];
    let fee = 1n;
    let requests = asSendRequestObject(to) as SendRequest[];
    let allocatedInputs = allocateFee(
      requests,
      fee,
      FeePaidByEnum.first,
      BigInt(0)
    );
    expect(allocatedInputs[0].value).toBeLessThan(2000n);
    expect(allocatedInputs[1].value).toBe(2000n);
  });

  test("Expect last to subtract fee from last", async () => {
    let to = [
      ["alice", 2000n],
      ["bob", 2000n],
    ];
    let fee = 1n;
    let requests = asSendRequestObject(to) as SendRequest[];
    let allocatedInputs = allocateFee(
      requests,
      fee,
      FeePaidByEnum.last,
      BigInt(0)
    );

    expect(allocatedInputs[0].value).toBe(2000n);
    expect(allocatedInputs[1].value).toBeLessThan(2000n);
  });

  test("Expect all to allocate fees equally", async () => {
    let to = [
      ["alice", 2000n],
      ["bob", 2000n],
      ["charlie", 2000n],
    ];
    let fee = 3n;
    let requests = asSendRequestObject(to) as SendRequest[];

    let allocatedInputs = allocateFee(
      requests,
      fee,
      FeePaidByEnum.any,
      BigInt(0)
    );

    expect(allocatedInputs[0].value).toBe(1999n);
    expect(allocatedInputs[1].value).toBe(1999n);
    expect(allocatedInputs[2].value).toBe(1999n);
  });

  test("Expect all to allocate fees equally, taking dust result", async () => {
    let to = [
      ["alice", 2000n],
      ["bob", 547n],
      ["charlie", 2000n],
    ];
    let fee = 300n;
    let requests = asSendRequestObject(to) as SendRequest[];

    let allocatedInputs = allocateFee(
      requests,
      fee,
      FeePaidByEnum.any,
      BigInt(0)
    );

    expect(allocatedInputs[0].value).toBe(2000n);
    expect(allocatedInputs[1].value).toBe(2000n);
    expect(allocatedInputs.length).toBe(2);
  });

  test("Expect all to allocate fees equally, taking dust result output, dividing remainder", async () => {
    let to = [
      ["alice", 2000n],
      ["bob", 547n],
      ["charlie", 2000n],
    ];
    let fee = 647n;
    let requests = asSendRequestObject(to) as SendRequest[];

    let allocatedInputs = allocateFee(
      requests,
      fee,
      FeePaidByEnum.any,
      BigInt(0)
    );

    expect(allocatedInputs[0].value).toBe(1950n);
    expect(allocatedInputs[1].value).toBe(1950n);
    expect(allocatedInputs.length).toBe(2);
  });

  test("Expect an odd fee to be applied to have remainder applied to first receipt", async () => {
    let to = [
      ["alice", 2000n],
      ["bob", 2000n],
      ["charlie", 2000n],
    ];
    let fee = 301n;
    let requests = asSendRequestObject(to) as SendRequest[];

    let allocatedInputs = allocateFee(
      requests,
      fee,
      FeePaidByEnum.any,
      BigInt(0)
    );

    expect(allocatedInputs[0].value).toBe(1899n);
    expect(allocatedInputs[1].value).toBe(1900n);
    expect(allocatedInputs[2].value).toBe(1900n);
  });

  test("Expect insufficient funds to error", async () => {
    let to = [
      ["alice", 2000n],
      ["bob", 2000n],
      ["charlie", 2000n],
    ];
    let fee = 7000n;
    let requests = asSendRequestObject(to) as SendRequest[];
    expect(() =>
      allocateFee(requests, fee, FeePaidByEnum.changeThenAny, BigInt(999))
    ).toThrow("Insufficient funds for transaction given fee");
  });

  test("Expect dust amounts to error", async () => {
    let to = [
      ["alice", 2000n],
      ["bob", 2000n],
      ["charlie", 2000n],
    ];
    let fee = 1500n;
    let requests = asSendRequestObject(to) as SendRequest[];
    expect(() =>
      allocateFee(requests, fee, FeePaidByEnum.first, BigInt(0))
    ).toThrow("Fee strategy would result in dust output");
  });

  test("Expect near-dust amounts not to error", async () => {
    let to = [
      ["alice", 1000n],
      ["bob", 1000n],
      ["charlie", 1000n],
    ];
    let fee = 1362n;
    let requests = asSendRequestObject(to) as SendRequest[];
    let result = allocateFee(requests, fee, FeePaidByEnum.any, BigInt(0));
    expect(result[0].value).toBe(546n);
    expect(result[1].value).toBe(546n);
    expect(result[2].value).toBe(546n);
  });

  test("Expect `any` to not consume change", async () => {
    let to = [
      ["alice", 1000n],
      ["bob", 1000n],
      ["charlie", 1000n],
    ];
    let fee = 1362n;
    let requests = asSendRequestObject(to) as SendRequest[];
    let result = allocateFee(requests, fee, FeePaidByEnum.any, BigInt(1362));
    expect(result[0].value).toBe(546n);
    expect(result[1].value).toBe(546n);
    expect(result[2].value).toBe(546n);
  });

  test("Expect `change,any` to consume only change", async () => {
    let to = [
      ["alice", 1000n],
      ["bob", 1000n],
      ["charlie", 1000n],
    ];
    let fee = 1362n;
    let requests = asSendRequestObject(to) as SendRequest[];
    let result = allocateFee(
      requests,
      fee,
      FeePaidByEnum.changeThenAny,
      BigInt(1362)
    );
    expect(result[0].value).toBe(1000n);
    expect(result[1].value).toBe(1000n);
    expect(result[2].value).toBe(1000n);
  });

  test("Expect `change,any` to use both", async () => {
    let to = [
      ["alice", 1000n],
      ["bob", 1000n],
      ["charlie", 1000n],
    ];
    let fee = 1362n * 2n;
    let requests = asSendRequestObject(to) as SendRequest[];
    let result = allocateFee(
      requests,
      fee,
      FeePaidByEnum.changeThenAny,
      BigInt(1362)
    );
    expect(result[0].value).toBe(546n);
    expect(result[1].value).toBe(546n);
    expect(result[2].value).toBe(546n);
  });

  test("Expect sortSendRequests to sort by lowest value first", async () => {
    let to = [
      ["alice", 2000n],
      ["bob", 547n],
      ["charlie", 1n],
      ["dave", 4n],
      ["edward", 6n],
      ["fred", 2000n],
      ["greg", 2000n],
      ["harry", 2000n],
    ];
    let fee = 1n;
    let requests = asSendRequestObject(to) as SendRequest[];

    let result = sortSendRequests(requests);
    expect(result[0].value).toBe(1n);
    expect(result[1].value).toBe(4n);
    expect(result[2].value).toBe(6n);
    expect(result[3].value).toBe(547n);
    expect(result[4].value).toBe(2000n);
    expect(result[5].value).toBe(2000n);
    expect(result.length).toBe(8);
  });
});
