import { ContractInfoResponseI, ContractResponseI } from "../interface";

export interface EscrowArguments {
  sellerAddr: string;
  buyerAddr: string;
  arbiterAddr: string;
  amount: number;
  nonce?: number;
}

export interface EscrowInfoResponseI extends ContractInfoResponseI {
  escrowContractId: string;
  buyerAddr: string;
  sellerAddr: string;
  arbiterAddr: string;
  amount: number;
}

export interface EscrowContractResponseI extends ContractResponseI {
  escrowContractId: string;
  cashaddr: string;
}
