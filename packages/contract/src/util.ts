import { hexToBin } from "@bitauth/libauth";

import {
  Mainnet,
  SendRequest,
  TokenSendRequest,
  Wallet,
  walletFromId,
} from "mainnet-js";

import {
  FunctionArgument,
  Artifact,
  Recipient as CashscriptReceipt,
  SignatureTemplate,
} from "cashscript";
import { TokenDetails } from "cashscript/dist/interfaces";

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
  const result: any[] = [];
  const inputs = artifact.constructorInputs;
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
      result.push(BigInt(value));
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
  args: FunctionArgument[],
  artifact: Artifact,
  funcName: string
) {
  const abi = artifact.abi.filter((abi) => abi.name === funcName)[0];
  const result: any[] = [];
  if (args) {
    for (let i = 0; i < args.length; i++) {
      if (abi.inputs[i].type.startsWith("bytes")) {
        const uint = hexToBin(args[i] as string);
        result.push(uint);
      } else if (abi.inputs[i].type === "int") {
        result.push(BigInt(args[i] as string));
      } else if (abi.inputs[i].type === "boolean") {
        result.push(Boolean(args[i]));
      } else if (abi.inputs[i].type === "sig") {
        const w = await walletFromId(args[i] as string);
        const sig = getSignatureTemplate(w);
        result.push(sig);
      } else {
        result.push(args[i]);
      }
    }
  }
  return result;
}

export async function transformContractToRequests(
  to:
    | SendRequest
    | SendRequest[]
    | TokenSendRequest
    | TokenSendRequest[]
    | CashscriptReceipt
    | CashscriptReceipt[]
): Promise<CashscriptReceipt[]> {
  if (Array.isArray(to)) {
    const result: CashscriptReceipt[] = [];
    for (const send of to) {
      result.push(await transformContractToRequestItems(send));
    }
    return result;
  } else {
    return [await transformContractToRequestItems(to)];
  }
}

async function transformContractToRequestItems(
  to: SendRequest | TokenSendRequest | CashscriptReceipt
): Promise<CashscriptReceipt> {
  if ("tokenId" in to) {
    return {
      to: to.cashaddr,
      amount: BigInt(to.value ?? 1000),
      token: {
        amount: to.amount ? BigInt(to.amount) : undefined,
        category: to.tokenId,
        nft:
          to.capability || to.commitment
            ? ({
                capability: to.capability,
                commitment: to.commitment,
              } as TokenDetails["nft"])
            : undefined,
      },
    } as CashscriptReceipt;
  } else if ("unit" in to) {
    const sat = await Mainnet.amountInSatoshi(to.value, to.unit);
    return { to: to.cashaddr, amount: BigInt(sat) } as CashscriptReceipt;
  } else {
    return {
      ...to,
      amount: typeof to.amount === "number" ? BigInt(to.amount) : to.amount,
    };
  }
}

// get a cashscript signature
export function getSignatureTemplate(wallet: Wallet) {
  return new SignatureTemplate(wallet.privateKeyWif as string);
}
