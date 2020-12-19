import { TxI } from "../interface";

export interface WalletI {
  id?: number;
  name: string;
  wallet: string;
}

export interface WebhookI {
  id?: number;
  address: string;
  type: string;
  recurrence: string;
  hook_url: string;
  status: string;
  last_height: number;
  tx_seen: Array<TxI>;
  expires_at: Date;
}
