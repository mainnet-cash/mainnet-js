import {
  authenticationTemplateToCompilerBCH,
  binToHex,
  hexToBin,
  utf8ToBin,
  validateAuthenticationTemplate,
} from "@bitauth/libauth";
import { parseSLP } from "slp-parser";
import { SlpGenesisTemplate } from "../slp/SlpLibAuth";

export const bigIntToBinUint64BE = (value) => {
  const uint64Length = 8;
  const bin = new Uint8Array(uint64Length);
  const writeAsLittleEndian = false;
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  // eslint-disable-next-line functional/no-expression-statement
  view.setBigUint64(0, value, writeAsLittleEndian);
  return bin;
};

test("Test SLP genesis txo template", async () => {
  const template = validateAuthenticationTemplate(SlpGenesisTemplate);
  if (typeof template === "string") {
    throw new Error("Transaction template error");
  }
  const compiler = await authenticationTemplateToCompilerBCH(template);

  let genesisTxoBytecode = compiler.generateBytecode("lock", {
    bytecode: {
      token_ticker: utf8ToBin("USDT"),
      token_name: utf8ToBin("Tether Ltd. US dollar backed tokens"),
      token_document_url: utf8ToBin(
        "https://tether.to/wp-content/uploads/2016/06/TetherWhitePaper.pdf"
      ),
      token_document_hash: hexToBin(
        "db4451f11eda33950670aaf59e704da90117ff7057283b032cfaec7779313916"
      ),
      decimals: Uint8Array.from([8]),
      mint_baton_vout: Uint8Array.from([2]),
      initial_token_mint_quantity: bigIntToBinUint64BE(
        BigInt(10000000000000000n)
      ),
    },
  });
  if (!genesisTxoBytecode.success) {
    throw new Error(genesisTxoBytecode.toString());
  }

  const hex = binToHex(genesisTxoBytecode.bytecode);
  expect(hex).toBe(
    "6a04534c500001010747454e45534953045553445423546574686572204c74642e20555320646f6c6c6172206261636b656420746f6b656e734168747470733a2f2f7465746865722e746f2f77702d636f6e74656e742f75706c6f6164732f323031362f30362f546574686572576869746550617065722e70646620db4451f11eda33950670aaf59e704da90117ff7057283b032cfaec77793139160108010208002386f26fc10000"
  );

  const obj = parseSLP(Buffer.from(hex, "hex"));
  //console.log(obj);
});
