import { convertLegacy } from "./convertLegacy";

test("Should a mainnet p2sh base58 address to cashaddr", async () => {
  let legacyBase58Address = "3NFvYKuZrxTDJxgqqJSfouNHjT1dAG1Fta";
  let cashaddr = await convertLegacy(legacyBase58Address);
  expect(cashaddr).toStrictEqual(
    "bitcoincash:prseh0a4aejjcewhc665wjqhppgwrz2lw5txgn666a"
  );
});

test("Should convertLegacy base58 address to cashaddr", async () => {
  let legacyBase58Address = "1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu";
  let cashaddr = await convertLegacy(legacyBase58Address);
  expect(cashaddr).toStrictEqual(
    "bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a"
  );
});

test("Should convertLegacy base58 address to cashaddr", async () => {
  let legacyBase58Address = "1HX5G7SaEMvgkapgawHH1oEBz9oMoCUVPT";
  let cashaddr = await convertLegacy(legacyBase58Address);
  expect(cashaddr).toStrictEqual(
    "bitcoincash:qz6nyrzr6vjnu56lt8wqwdezghrycwug7s77wwc57v"
  );
});

test("Should convert testnet p2sh address to cashaddr", async () => {
  let legacyBase58Address = "mrLC19Je2BuWQDkWSTriGYPyQJXKkkBmCx";
  let cashaddr = await convertLegacy(legacyBase58Address);
  expect(cashaddr).toStrictEqual(
    "bchtest:qpm2qsznhks23z7629mms6s4cwef74vcwvqcw003ap"
  );
});

test("Should convert testnet p2pk address to cashaddr", async () => {
  let legacyBase58Address = "msdybMgY5oEtDf2cEYtUnz3eZSUYehRtnx";
  let cashaddr = await convertLegacy(legacyBase58Address);
  expect(cashaddr).toStrictEqual(
    "bchtest:qzz0tq2rg2xjgswchsvdrqzudsle8vje9g0zyhnap8"
  );
});
test("Should convert regtest p2pk address to cashaddr", async () => {
  let legacyBase58Address = "mo9ncXisMeAoXwqcV5EWuyncbmCcQN4rVs";
  let cashaddr = await convertLegacy(legacyBase58Address, "bchreg");
  expect(cashaddr).toStrictEqual(
    "bchreg:qpfuqvradpg65r88sfd63q7xhkddys45sce8xqrjhg"
  );
});
test("Should convert regtest p2sh address to cashaddr", async () => {
  let legacyBase58Address = "mrLC19Je2BuWQDkWSTriGYPyQJXKkkBmCx";
  let cashaddr = await convertLegacy(legacyBase58Address, "bchreg");
  expect(cashaddr).toStrictEqual(
    "bchreg:qpm2qsznhks23z7629mms6s4cwef74vcwv6ycwvz78"
  );
});

test("Should throw error on unknown character", () => {
  expect(async () => {
    await convertLegacy("1AGNa15ZQXAZUgFiqJ2i7Z2DPU2J6hW62I");
  }).rejects.toThrow(
    "Base58Address error: address may only contain valid base58 characters"
  );
});
