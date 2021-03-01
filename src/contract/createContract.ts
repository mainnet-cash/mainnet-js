import { EscrowContract } from "./escrow";
import { Contract } from "./Contract";
import { ContractResponseI } from "./interface";

/**
 * contractClassMap - Convenience map to access hardcoded contract types by name
 */
const contractClassMap = {
  escrow: () => {
    return EscrowContract;
  },
};

/**
 * createContract - Create a new contract, from a json request
 * @param body A create contract request
 * @returns A new contract object
 */
export async function createContract(body: any): Promise<Contract> {
  let contractType = body.type;
  // This handles unsaved/unnamed wallets
  if (contractType in contractClassMap) {
    let contractClass = contractClassMap[contractType]();
    let contract = await contractClass.create(body);
    return contract;
  } else {
    return Contract._create(body.script, body.parameters, body.network);
  }
}

/**
 * Create a new contract, from a serialized string
 * @param contractId A serialized contractId string
 * @returns A new contract object
 */
export async function contractFromId(contractId: string): Promise<Contract> {
  return Contract.fromId(contractId);
}

/**
 * Create a new contract, but respond with a json object
 * @param request A contract request object
 * @returns A new contract object
 */
export async function createContractResponse(
  request: any
): Promise<ContractResponseI> {
  let contract = await createContract(request);
  if (contract) {
    return asJsonResponse(contract);
  } else {
    throw Error("Error creating contract");
  }
}

/**
 * Serialize a contract as json
 * @param contract A contract object
 * @returns A json response
 */
function asJsonResponse(contract: Contract): ContractResponseI {
  return {
    contractId: contract.toString(),
    cashaddr: contract.getDepositAddress(),
  };
}
