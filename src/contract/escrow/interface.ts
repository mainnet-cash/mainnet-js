export interface EscrowArguments {
    sellerAddr: string;
    buyerAddr: string;
    arbiterAddr: string;
    amount: number;
    nonce?: number;
}