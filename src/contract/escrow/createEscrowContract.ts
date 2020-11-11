import { EscrowContract } from "./EscrowContract";


interface EscrowRequest {
    sellerAddr: string;
    buyerAddr: string;
    arbiterAddr: string;
}

interface EscrowResponse {
    contractId: string
}


