import { ExchangeRate } from "../rate/ExchangeRate";

export function getUsdRate() {
  return ExchangeRate.get("usd");
}
