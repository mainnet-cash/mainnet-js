export interface RegisterWebhookParams {
  cashaddr: string;
  url: string;
  type: string;
  recurrence: string;
  duration_sec?: number;
}
