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

export interface sslConfigI {
  rejectUnauthorized: boolean;
  ca?: string;
  key?: string;
  cert?: string;
}

export interface FaucetQueueItemI {
  id: number;
  address: string;
  token: string;
  value: string;
}
