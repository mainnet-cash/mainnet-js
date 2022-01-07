export const DELIMITER = ":";

// Min amount utxo can be to be accepted by the network
export const DUST_UTXO_THRESHOLD = 546;

// Current chained tx limit
export const MEMPOOL_CHAIN_LIMIT = 50;

// time in milliseconds to cache the usd exchange rate
export const EXCHANGE_RATE_TTL = 250000;

// list of common derivation paths
// a la: https://github.com/Electron-Cash/Electron-Cash/blob/1de24c509992cfebc22217a2a77c862c2b02bc54/electroncash_gui/qt/installwizard.py#L624
export const DERIVATION_PATHS = [
  "m/0",
  "m/0'",
  "m/0'/0",
  "m/0'/0'",
  "m/0'/0'/0'",
  "m/44'/0'/0'",
  "m/44'/0'/0'/0",
  "m/44'/145'/0'",
  "m/44'/145'/0'/0",
  "m/44'/245'/0",
  "m/44'/245'/0'",
  "m/44'/245'/0'/0",
];
