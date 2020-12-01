export interface ContractI {
    /**
     * toString should return a serialized representation of the contract
     * @returns returns a serialized representation of the contract
     */
    toString(): string;
    getAddress(): string | Error;
  
    /**
     * getContractText should return the cashscript text
     * @returns returns contract in script as a string
     */
    getContractText(): string | Error;
  }


  export interface ContractResponseI {
    contractId: string;
    address: string;
  }