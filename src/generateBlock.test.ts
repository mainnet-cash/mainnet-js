import { generateBlock } from "./generateBlock";

test("Generate a block on a Regression Network", () => {
  let blockHashes = generateBlock(
    process.env.RPC_USER || "alice",
    process.env.RPC_PASS || "password",
    1,
    process.env.BCHD_BIN_DIRECTORY || "bin"
  );
  expect(blockHashes[0].length).toBe(64);
});
