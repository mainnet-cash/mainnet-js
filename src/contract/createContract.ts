import { EscrowContract } from "./escrow";
import { Contract } from "./Contract"

var contactClassMap = {
    escrow: () => {
        return EscrowContract;
    }
};

interface ContractRequest {
    contractId: string;
}

interface ContractResponse {
    contractId: string
}

export async function contractFromId(contractId: string): Promise<any> {
    let contractArgs: string[] = contractId.split(":");
    let contractType = contractArgs.shift()
    let contract = await contactClassMap[contractType!].create(contractArgs);
    return contract;
}

/**
 * Create a new wallet
 * @param escrowRequest A wallet request object
 * @returns A new wallet object
 */
export async function createContractResponse(
    request: ContractRequest
): Promise<ContractResponse> {
    let contract = await contractFromId(request.contractId);
    if (contract) {
        return asJsonResponse(contract);
    } else {
        throw Error("Error creating wallet");
    }
}

function asJsonResponse(contract: Contract): ContractResponse {
    return {
        contractId: contract.toString()
    };
}