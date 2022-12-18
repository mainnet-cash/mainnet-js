import { ContractInfoResponseI, ContractResponseI } from "../interface.js";

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

export interface EscrowContractResponseI {
  escrowContractId: string;
  cashaddr: string;
}
