export interface WalletI {
  id?: number;
  name: string;
  wallet: string;
}

export interface WebHookI {
  id?: number;
  address: string;
  type: string;
  recurrence: string;
  hook_url: string;
  status: string;
  last_tx: string;
  expires_at: Date;
}