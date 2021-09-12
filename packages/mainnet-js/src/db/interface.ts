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
