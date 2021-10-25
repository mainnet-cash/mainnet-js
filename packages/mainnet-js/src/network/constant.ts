import { ClusterOrder } from "electrum-cash";

export const ELECTRUM_CASH_PROTOCOL_VERSION = "1.4.1";

export const networkTickerMap = {
  mainnet: "BCH",
  testnet: "tBCH",
  regtest: "rBCH",
};

export const mainnetServers = ["wss://fulcrum.fountainhead.cash"];

export const testnetServers = [
  //"wss://electroncash.de:60004", //,
  "wss://testnet.bitcoincash.network:60004",
  "wss://blackie.c3-soft.com:60004",
  "wss://tbch.loping.net:60004",
];

export const regtestServers = ["ws://127.0.0.1:60003"];

export const defaultServers = {
  mainnet: mainnetServers,
  testnet: testnetServers,
  regtest: regtestServers,
};

export const clusterParams = {
  mainnet: {
    distribution: 2,
    order: ClusterOrder.PRIORITY,
    timeout: 45000,
  },
  testnet: {
    distribution: 1,
    order: ClusterOrder.PRIORITY,
    timeout: 50000,
  },
  regtest: {
    distribution: 1,
    order: ClusterOrder.PRIORITY,
    timeout: 5000,
  },
};
