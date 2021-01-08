import { TxI } from "../interface";

export interface WalletI {
  id?: number;
  name: string;
  wallet: string;
}

export interface ExchangeRateI {
  symbol: string;
  rate: number;
  ttl: number;
}

export interface WebhookI {
  id?: number;
  cashaddr: string;
  type: string;
  recurrence: string;
  hook_url: string;
  status: string;
  last_height: number;
  tx_seen: Array<TxI>;
  expires_at: Date;
}

export interface RegisterWebhookParams {
  cashaddr: string;
  url: string;
  type: string;
  recurrence: string;
  duration_sec?: number;
}
