require("dotenv").config({ path: ".env.regtest" });
import { generateBlock } from "./generateBlock";

test("Generate a block on a Regression Network", () => {
  let blockHashes = generateBlock(
    process.env.RPC_USER,
    process.env.RPC_PASS,
    1
  );
  expect(blockHashes[0].length).toBe(64);
});
