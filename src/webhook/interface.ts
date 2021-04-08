import { TxI } from "../interface";

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
  stopCallback?: () => void;
}

export interface RegisterWebhookParams {
  cashaddr: string;
  url: string;
  type: string;
  recurrence: string;
  duration_sec?: number;
}
