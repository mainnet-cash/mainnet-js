import { HeaderI, HexHeaderI } from "../interface";
import { disconnectProviders, initProviders } from "../network";
import { Wallet } from "../wallet/Wif";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe("header tests", () => {
  it("decodeHeader", async () => {
    const wallet = await Wallet.newRandom();
    const hexHeader = (await wallet.provider!.getHeader(854724)) as HexHeaderI;
    expect(hexHeader.height).toBe(854724);
    expect(hexHeader.hex).toBe(
      "0080c4339674a81d4e35a5b590b15a6b69f93b7b22bd14845b3517000000000000000000128a8b776c82fda87f60c6fdb0de26f021cdf39ffd835dc309eb1fc6bbfaac343e2f96662d5202184db2428f"
    );

    const header = (await wallet.provider!.getHeader(854724, true)) as HeaderI;
    expect(header.version).toBe(868515840);
    expect(header.previousBlockHash).toBe(
      "00000000000000000017355b8414bd227b3bf9696b5ab190b5a5354e1da87496"
    );
    expect(header.merkleRoot).toBe(
      "34acfabbc61feb09c35d83fd9ff3cd21f026deb0fdc6607fa8fd826c778b8a12"
    );
    expect(header.timestamp).toBe(1721118526);
    expect(header.bits).toBe(402805293);
    expect(header.nonce).toBe(2403512909);
    expect(header.height).toBe(854724);
  });
});
