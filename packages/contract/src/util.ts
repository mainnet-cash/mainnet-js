import { hexToBin } from "@bitauth/libauth";

import {
  Argument,
  Artifact,
  Recipient as CashscriptReceipt,
  SignatureTemplate,
} from "cashscript";

import { Mainnet, SendRequest, walletFromId } from "mainnet-js";

/**
 * castConstructorParametersFromArtifact - Cast string arguments to the appropriate cashscript contract constructor input
 *
 * low-level utility function
 *
 * @param parameters String arguments to construct inputs from
 * @param inputs The name and type of required arguments for the transaction constructor
 * @returns A list of constructor parameters
 */
export function castConstructorParametersFromArtifact(
  parameters: string[],
  artifact: Artifact
) {
  let result: any[] = [];
  let inputs = artifact.constructorInputs;
  parameters.forEach(function (value, i) {
    if (inputs[i].type.startsWith("bytes")) {
      if (typeof value === "string") {
        let uint;
        if (value.includes(",")) {
          uint = Uint8Array.from(
            value.split(",").map((vStr) => parseInt(vStr))
          );
        } else {
          uint = hexToBin(value);
        }
        result.push(uint);
      } else {
        throw Error(`Couldn't parse ${value} from string to bytes`);
      }
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

/**
 * Cast string arguments to form suitable for the appropriate cashscript contract function input
 * @param args String arguments to construct inputs from
 * @param artifact The contract artifact
 * @param function The function name
 * @returns A list of arguments
 */
export async function castStringArgumentsFromArtifact(
  args: Argument[],
  artifact: Artifact,
  funcName: string
) {
  let abi = artifact.abi.filter((abi) => abi.name === funcName)[0];
  let result: any[] = [];
  for (let i = 0; i < args.length; i++) {
    if (abi.inputs[i].type.startsWith("bytes")) {
      let uint = hexToBin(args[i] as string);
      result.push(uint);
    } else if (abi.inputs[i].type === "int") {
      result.push(args[i] as number);
    } else if (abi.inputs[i].type === "boolean") {
      result.push(Boolean(args[i]));
    } else if (abi.inputs[i].type === "sig") {
      let w = await walletFromId(args[i] as string);
      let sig = getSignatureTemplate(w);
      result.push(sig);
    } else {
      result.push(args[i]);
    }
  }
  return result;
}

export async function transformContractToRequests(
  to: SendRequest | SendRequest[] | CashscriptReceipt | CashscriptReceipt[]
): Promise<CashscriptReceipt[]> {
  if (Array.isArray(to)) {
    let result: CashscriptReceipt[] = [];
    for (let send of to) {
      result.push(await transformContractToRequestItems(send));
    }
    return result;
  } else {
    return [await transformContractToRequestItems(to)];
  }
}

async function transformContractToRequestItems(
  to: SendRequest | CashscriptReceipt
): Promise<CashscriptReceipt> {
  if ("unit" in to) {
    let sat = await Mainnet.amountInSatoshi(to.value, to.unit);
    return { to: to.cashaddr, amount: sat } as CashscriptReceipt;
  } else {
    return to;
  }
}

// get a cashscript signature
export function getSignatureTemplate(wallet) {
  return new SignatureTemplate(wallet.privateKeyWif as string);
}
