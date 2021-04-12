import SqlProvider from "../db/SqlProvider";
import { TxI } from "../interface";

export interface WebhookI {
  id?: number;
  cashaddr: string;
  type: string;
  recurrence: string;
  url: string;
  status: string;
  last_height: number;
  tx_seen: Array<TxI>;
  expires_at: Date;
  stopCallback?: () => void;

  start: () => void;
  stop: () => void;
  destroy: () => void;

  db: SqlProvider;
}

export interface RegisterWebhookParams {
  cashaddr: string;
  url: string;
  type: string;
  recurrence: string;
  tokenId?: string;
  duration_sec?: number;
}
