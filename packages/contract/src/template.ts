import { AbiFunction, SignatureTemplate, Transaction, Utxo } from "cashscript";
import { Contract } from "./Contract";
import { PrimitiveType } from "@cashscript/utils";
import { Argument, encodeArgument as csEncodeArgument } from "cashscript/dist/Argument";
import { isSignableUtxo, SignableUtxo, LibauthOutput, Output } from "cashscript/dist/interfaces";
import { hash160, hexToBin, AuthenticationTemplateScenarioBytecode, AuthenticationTemplateScenarioTransactionOutput, binToBase64, utf8ToBin, decodeCashAddress, Transaction as LibauthTransaction, generateDefaultScenarioDefinition, AuthenticationTemplateScenario, cashAddressToLockingBytecode, AuthenticationTemplateScenarioOutput, Output as LibAuthOutput, AuthenticationTemplateScenarioSourceOutput, decodeTransaction, LockingBytecodeType, addressContentsToLockingBytecode, numberToBinUint16LE, binToHex, AuthenticationTemplate, AuthenticationTemplateScenarioInput, AuthenticationTemplateVariable, AuthenticationTemplateScenarioData } from "@bitauth/libauth"
import { deflate } from "pako";
import { Network } from "mainnet-js";

function snake_case(str: string) {
  return str && str.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)!
      .map(s => s.toLowerCase())
      .join('_');
}
const merge = (array: any) => array.reduce((prev: Object, cur: Object) => ({...prev,...{[Object.keys(cur)[0]]: cur[Object.keys(cur)[0]]}}), {});

const encodeArgument = (argument: Argument, typeStr: string): Uint8Array | SignatureTemplate => {
  if (typeStr === PrimitiveType.INT && argument === 0n) {
    return Uint8Array.from([0]);
  }
  return csEncodeArgument(argument, typeStr);
}

export const stringify = (any: any, spaces?: number) => JSON.stringify(any,
(_, v) => {
  if (typeof v === 'bigint') {
    return `${v.toString()}`;
  }
  if (v instanceof Uint8Array) {
    return `${binToHex(v)}`;
  }
  return v;
}, spaces);

export const getBitauthUri = (template: AuthenticationTemplate) => {
  const base64toBase64Url = (base64: string) =>
    base64.replace(/\+/g, '-').replace(/\//g, '_');
  const payload = base64toBase64Url(
    binToBase64(
      deflate(
        utf8ToBin(
          stringify(template)
        )
      )
    )
  );
  return `https://ide.bitauth.com/import-template/${payload}`;
}

export const buildTemplate = async ({
  contract, transaction, manglePrivateKeys, includeSource = false} : {
    contract: Contract, transaction: Transaction, manglePrivateKeys?: boolean, includeSource?: boolean
  }
  ): Promise<AuthenticationTemplate> => {
  if (manglePrivateKeys === undefined && contract.network !== Network.REGTEST) {
    manglePrivateKeys = true
  } else {
    manglePrivateKeys = false;
  }

  const txHex = await transaction.build();

  const libauthTransaction = decodeTransaction(hexToBin(txHex)) as any;
  if (typeof libauthTransaction === "string") {
    throw libauthTransaction;
  }

  const constructorInputs = contract.artifact.constructorInputs.slice().reverse();
  const contractParameters = contract.parameters.slice().reverse();

  const abiFunction = (transaction as any).abiFunction as AbiFunction;
  const funcName = abiFunction.name;
  const functionIndex = contract.artifact.abi.findIndex(val => val.name === funcName)!;
  const func: AbiFunction = contract.artifact.abi[functionIndex];
  const functionInputs = func.inputs.slice().reverse();
  const args = ((transaction as any).args as (Uint8Array | SignatureTemplate)[]).slice().reverse();

  const hasSignatureTemplates = ((transaction as any).inputs as Utxo[]).filter(val => isSignableUtxo(val)).length;

  const zip = (a: any[], b: any[]) => Array.from(Array(Math.max(b.length, a.length)), (_, i) => [a[i], b[i]]);

return {
  "$schema": "https://ide.bitauth.com/authentication-template-v0.schema.json",
  "description": `Imported from cashscript${includeSource ? contract.artifact.source : ""}`,
  "name": contract.artifact.contractName,
  "entities": {
    "parameters": {
      "description": "Contract creation and function parameters",
      "name": "parameters",
      "scripts": [
        "lock",
        "unlock_lock",
        ...(hasSignatureTemplates ? [
          "p2pkh_placeholder_lock",
          "p2pkh_placeholder_unlock",
        ] : [])
      ],
      "variables":
        merge([
          ...(hasSignatureTemplates ? [{
            "placeholder_key": {
              "description": "placeholder_key",
              "name": "placeholder_key",
              "type": "Key"
            }
          }] : []),
          {"function_index": {
            description: "Script function index to execute",
            name: "function_index",
            type: "WalletData"
          }},
          ...constructorInputs.map(input => ({
            [snake_case(input.name)]: {
              description: `"${input.name}" parameter of this contract`,
              name: input.name,
              type: "WalletData"
            }
          })),
          ...functionInputs.map(input => ({
            [snake_case(input.name)]: {
              description: `"${input.name}" parameter of function "${func.name}"`,
              name: input.name,
              type: input.type === PrimitiveType.SIG ? "Key" : "WalletData"
            }
          })),
        ])
    }
  },
  "scenarios": {
    "evaluate_function": {
      "data": {
        "bytecode":
          merge([
            ...zip(functionInputs, args).filter(([input]) => input.type !== PrimitiveType.SIG).map(([input, arg]) => {
              const encoded = encodeArgument(arg, input.type);
              return ({
                [snake_case(input.name)]: "0x" + binToHex(encoded as Uint8Array)
              })
            }),
            {"function_index": functionIndex.toString()},
            ...constructorInputs.map((input, index) => ({
              [snake_case(input.name)]: "0x" + binToHex(encodeArgument(contractParameters[index], constructorInputs[index].type) as Uint8Array)
            })),
          ],
          ),
        "currentBlockHeight": 2,
        "currentBlockTime": Math.round(+new Date/1000),
        "keys": {
          "privateKeys": merge([
            ...(hasSignatureTemplates ? [{
              "placeholder_key": "<Uint8Array: 0x0000000000000000000000000000000000000000000000000000000000000000>"}] : []),
            ...zip(functionInputs, args).filter(([input]) => input.type === PrimitiveType.SIG).map(([input, arg]) => ({
              [snake_case(input.name)]: binToHex(manglePrivateKeys ? (arg as SignatureTemplate).getPublicKey().slice(0, 32).slice(0, 32) : (arg as SignatureTemplate | any).privateKey)
            }))
          ])
        }
      },
      "transaction": [libauthTransaction].map((val: any) => {
        const result = {} as AuthenticationTemplateScenario["transaction"];
        let inputSlotInserted = false;
        result!.inputs = val!.inputs!.map((input, index) => {
          const csInput = (transaction as any).inputs[index] as Utxo;
          const signable = isSignableUtxo(csInput);
            let unlockingBytecode = {};
          if (signable) {
            unlockingBytecode = {
              "script": "p2pkh_placeholder_unlock",
              "overrides": {
                keys: {
                  privateKeys: {
                    placeholder_key: binToHex(manglePrivateKeys ? (csInput as SignableUtxo).template.getPublicKey().slice(0, 32) : ((csInput as SignableUtxo).template as any).privateKey)
                  }
                }
              }
            };
          } else {
            // assume it is our contract's input
            if (!inputSlotInserted) {
              unlockingBytecode = ["slot"];
              inputSlotInserted = true;
            }
          }
          return ({
            outpointIndex: input.outpointIndex,
            outpointTransactionHash: input.outpointTransactionHash instanceof Uint8Array? binToHex(input.outpointTransactionHash) : input.outpointTransactionHash,
            sequenceNumber: input.sequenceNumber,
            unlockingBytecode: unlockingBytecode
          }) as AuthenticationTemplateScenarioInput})
        result!.locktime = val?.locktime;

        result!.outputs = val?.outputs?.map((output: LibauthOutput, index) => {
          const csOutput = (transaction as any).outputs[index] as Output;
          let lockingBytecode: any = output.lockingBytecode;
          if (typeof csOutput.to === "string") {
            if ([contract.getDepositAddress(), contract.getTokenDepositAddress()].includes(csOutput.to)) {
              lockingBytecode = {};
            }
            else {
              for (const csInput of ((transaction as any).inputs as Utxo[])) {
                if (isSignableUtxo(csInput)) {
                  const inputPkh = hash160(csInput.template.getPublicKey());
                  if (binToHex(output.lockingBytecode).slice(6, 46) === binToHex(inputPkh)) {
                    lockingBytecode = {
                      "script": "p2pkh_placeholder_lock",
                      "overrides": {
                        keys: {
                          privateKeys: {
                            placeholder_key: binToHex(manglePrivateKeys ? csInput.template.getPublicKey().slice(0, 32) : (csInput.template as any).privateKey)
                          }
                        }
                      }
                    };
                  }
                }
              }
            }
          }
          return {
              lockingBytecode: lockingBytecode instanceof Uint8Array ? binToHex(lockingBytecode) : lockingBytecode,
              token: output.token,
              valueSatoshis: Number(output.valueSatoshis)
            } as AuthenticationTemplateScenarioTransactionOutput
        });
        result!.version = libauthTransaction.version;
        return result
      })[0] as AuthenticationTemplateScenario["transaction"],
      "sourceOutputs": ((transaction as any).inputs as Utxo[]).map((val, index) => {
        const result = {} as AuthenticationTemplateScenarioSourceOutput | any;
        let inputSlotInserted = false;
        const csInput = (transaction as any).inputs[index] as Utxo;
        const signable = isSignableUtxo(csInput);
        let unlockingBytecode = {};
        if (signable) {
          unlockingBytecode = {
            "script": "p2pkh_placeholder_lock",
            "overrides": {
              keys: {
                privateKeys: {
                  placeholder_key: binToHex(manglePrivateKeys ? csInput.template.getPublicKey().slice(0, 32) : (csInput.template as any).privateKey)
                }
              }
            }
          } as AuthenticationTemplateScenarioBytecode;
        } else {
          // assume it is our contract's input
          if (!inputSlotInserted) {
            unlockingBytecode = ["slot"];
            inputSlotInserted = true;
          }
        }

        result.lockingBytecode = unlockingBytecode;
        result.valueSatoshis = Number(csInput.satoshis);
        result.token = csInput.token;
        return result;
      }),
      "description": "An example evaluation where this script execution passes.",
      "name": "Evaluate",
    }
  },
  "scripts": {
    "unlock_lock": {
      "passes": [
        "evaluate_function"
      ],
      "name": "unlock",
      "script": [
        `// "${func.name}" function parameters`,
        ...(functionInputs.length ? zip(functionInputs, args).map(([input, arg]) => input.type === PrimitiveType.SIG ?
            `<${snake_case(input.name)}.schnorr_signature.all_outputs> // ${input.type}` :
            `<${snake_case(input.name)}> // ${input.type} = <${"0x" + binToHex(encodeArgument(arg, input.type) as Uint8Array)}>`)
          : ["// none"]),
        "",

        ...(contract.artifact.abi.length > 1 ? [
          "// function index in contract",
          `<function_index> // int = <${functionIndex.toString()}>`,
          ""
        ] : []),

        `// "${contract.artifact.contractName}" contract constructor parameters`,
        ...(constructorInputs.length ? constructorInputs.map((input, index) => {
          const encoded = encodeArgument(contractParameters[index], constructorInputs[index].type) as Uint8Array;
          return `<${snake_case(input.name)}> // ${input.type === "bytes" ? "bytes"+encoded.length : input.type} = <${ "0x" + binToHex(encoded)}>`;
        }) : ["// none"]),
      ].join('\n'),
      "unlocks": "lock"
    },
    "lock": {
      "lockingType": "p2sh20",
      "name": "lock",
      "script": contract.artifact.bytecode.split(' ').map(val => {
        try {
          return `<0x${BigInt("0x"+val).toString(16)}>`
        } catch {
          return val
        }}).join('\n')
    },
    ...(hasSignatureTemplates ? {
      "p2pkh_placeholder_unlock": {
        "name": "p2pkh_placeholder_unlock",
        "script": "<placeholder_key.schnorr_signature.all_outputs>\n<placeholder_key.public_key>",
        "unlocks": "p2pkh_placeholder_lock"
      },
      "p2pkh_placeholder_lock": {
        "lockingType": "standard",
        "name": "p2pkh_placeholder_lock",
        "script": "OP_DUP\nOP_HASH160 <$(<placeholder_key.public_key> OP_HASH160\n)> OP_EQUALVERIFY\nOP_CHECKSIG"
      }
    } : {})
  },
  "supported": [
    "BCH_SPEC"
  ],
  "version": 0
} as AuthenticationTemplate;
}
