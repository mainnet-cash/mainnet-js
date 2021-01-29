import { toCashAddress, toSlpAddress } from "./bchaddr";

test.skip("Should convert between bch and slp addresses", async () => {
  let addr = "bitcoincash:qpttdv3qg2usm4nm7talhxhl05mlhms3ystlwcm8h4";
  let slpAddr = "simpleledger:qpttdv3qg2usm4nm7talhxhl05mlhms3ys8y9rw8ft";
  expect(toCashAddress(addr)).toBe(addr);
  expect(toSlpAddress(addr)).toBe(slpAddr);

  expect(toCashAddress(slpAddr)).toBe(addr);
  expect(toSlpAddress(addr)).toBe(slpAddr);

  addr = "bchtest:qpttdv3qg2usm4nm7talhxhl05mlhms3ys0d2lessf";
  slpAddr = "slptest:qpttdv3qg2usm4nm7talhxhl05mlhms3ys5edyr8z5";
  expect(toCashAddress(addr)).toBe(addr);
  expect(toSlpAddress(addr)).toBe(slpAddr);

  expect(toCashAddress(slpAddr)).toBe(addr);
  expect(toSlpAddress(addr)).toBe(slpAddr);

  addr = "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0";
  slpAddr = "slpreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ysg3x0302x";
  expect(toCashAddress(addr)).toBe(addr);
  expect(toSlpAddress(addr)).toBe(slpAddr);

  expect(toCashAddress(slpAddr)).toBe(addr);
  expect(toSlpAddress(addr)).toBe(slpAddr);
});
