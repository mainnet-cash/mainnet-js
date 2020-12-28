import {
  AuthenticationInstructions,
  disassembleBytecodeBCH,
  parseBytecode,
} from "@bitauth/libauth";

import { AbiInput } from "cashscript";

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

export function castArgumentsFromFunction(
  args: string[],
  inputs: AbiInput[]
) {
  let result: any[] = [];
  args.forEach(function (value, i) {
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
