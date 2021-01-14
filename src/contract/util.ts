import {
  AuthenticationInstructions,
  disassembleBytecodeBCH,
  hexToBin,
  parseBytecode,
} from "@bitauth/libauth";

import { AbiInput, Argument } from "cashscript";

import { walletFromId } from "../wallet/createWallet"

export type Op = number;
export type OpOrData = Op | Uint8Array;
export type Script = OpOrData[];

export function bytecodeToScript(bytecode: Uint8Array): Script {
  // Convert the bytecode to AuthenticationInstructions
  const instructions = parseBytecode(bytecode) as AuthenticationInstructions;

  // Convert the AuthenticationInstructions to script elements
  const script = instructions.map((instruction) =>
    "data" in instruction ? instruction.data : instruction.opcode
  );

  return script;
}

export function bytecodeToAsm(bytecode: Uint8Array): string {
  // Convert the bytecode to libauth's ASM format
  let asm = disassembleBytecodeBCH(bytecode);

  // COnvert libauth's ASM format to BITBOX's
  asm = asm.replace(/OP_PUSHBYTES_[^\s]+/g, "");
  asm = asm.replace(/OP_PUSHDATA[^\s]+ [^\s]+/g, "");
  asm = asm.replace(/(^|\s)0x/g, " ");

  // Remove any duplicate whitespace
  asm = asm.replace(/\s+/g, " ").trim();

  return asm;
}

export function castParametersFromConstructor(
  parameters: string[],
  inputs: AbiInput[]
) {
  let result: any[] = [];
  parameters.forEach(function (value, i) {
    if (inputs[i].type.startsWith("bytes")) {
      let uint = Uint8Array.from(
        value.split(",").map((vStr) => parseInt(vStr))
      );
      result.push(uint);
    } else if (inputs[i].type === "int") {
      result.push(parseInt(value));
    } else if (inputs[i].type === "boolean") {
      result.push(Boolean(value));
    } else {
      result.push(value);
    }
  });
  return result;
}

export async function castArgumentsFromFunction(args: Argument[], inputs: AbiInput[]) {
  let result: any[] = [];
  for( let i=0; i< args.length; i++) {
    if (inputs[i].type.startsWith("bytes")) {
      let uint = hexToBin(args[i] as string);
      result.push(uint);
    } else if (inputs[i].type === "int") {
      result.push(args[i] as number);
    } else if (inputs[i].type === "boolean") {
      result.push(Boolean(args[i]));
    } else if (inputs[i].type === "sig") {
      let w = await walletFromId(args[i] as string)
      let sig = w.getSignatureTemplate()
      result.push(sig);
    } else {
      result.push(args[i]);
    }
  };
  return result;
}
