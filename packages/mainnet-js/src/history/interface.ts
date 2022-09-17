import { UnitEnum } from "../enum";

export interface TransactionHistoryItemI {
        "to": string;
        "from": string;
        "unit": UnitEnum;
        "index": number;
        "blockheight": number;
        "txn": string;
        "txId": string;
        "value": number;
        "fee"?: number;
        "balance"?: number;
    
}

export interface TransactionHistoryI {
    transactions: TransactionHistoryItemI[];
}