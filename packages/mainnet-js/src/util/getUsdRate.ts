import { ExchangeRate } from "../rate/ExchangeRate.js";

export function getUsdRate() {
  return ExchangeRate.get("usd");
}
