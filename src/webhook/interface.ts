export interface RegisterWebhookParams {
  cashaddr: string;
  url: string;
  type: string;
  recurrence: string;
  tokenId?: string;
  duration_sec?: number;
}
