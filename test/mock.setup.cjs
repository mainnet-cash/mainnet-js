/**
 * Vitest setup file for MockNetworkProvider mode.
 * Activated by USE_MOCK_PROVIDER=1. Loads env vars.
 * The mock provider is created eagerly by initProvider() when
 * any code first calls getNetworkProvider() or initProviders().
 */
if (process.env.USE_MOCK_PROVIDER) {
  require("dotenv").config({ path: ".env.regtest" });
  require("dotenv").config({ path: ".env.testnet" });
  // Provide a dummy DATABASE_URL so SqlProvider's constructor doesn't throw
  // when pg is mocked in mock-provider mode.
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mock";
  }
}
