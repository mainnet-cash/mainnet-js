import { ClusterOrder } from "electrum-cash";

export const ELECTRUM_CASH_PROTOCOL_VERSION = "1.5";

export const networkTickerMap = {
  mainnet: "BCH",
  testnet: "tBCH",
  regtest: "rBCH",
};

export const mainnetServers = [
  "wss://bch.imaginary.cash:50004",
  //"wss://blackie.c3-soft.com:50004",
  // "wss://electrum.imaginary.cash:50004",
  // "wss://fulcrum.fountainhead.cash",
];

// export const testnetServers = [
//   // "wss://tbch.loping.net:60004",
//   "wss://blackie.c3-soft.com:60004",
//   // "wss://testnet.bitcoincash.network:60004",
//   //,"wss://unavailable.invalid:50004"
// ];

// testnet4
// export const testnetServers = [
//   //"wss://t4fork.c3-soft.com:61004",
//   "wss://testnet4.imaginary.cash:50004",
//   //,"wss://unavailable.invalid:50004"
// ];

// chipnet
export const testnetServers = [
  "wss://chipnet.imaginary.cash:50004",
  //"wss://blackie.c3-soft.com:64004", // chipnet with protocol 1.5.0
  //"wss://chipnet.bch.ninja:50004"
];

export const regtestServers = ["ws://127.0.0.1:60003"];

export const defaultServers = {
  mainnet: mainnetServers,
  testnet: testnetServers,
  regtest: regtestServers,
};

export const clusterParams = {
  mainnet: {
    confidence: 1,
    distribution: 1,
    order: ClusterOrder.RANDOM,
    timeout: 45000,
  },
  testnet: {
    confidence: 1,
    distribution: 1,
    order: ClusterOrder.RANDOM,
    timeout: 30000,
  },
  regtest: {
    confidence: 1,
    distribution: 1,
    order: ClusterOrder.PRIORITY,
    timeout: 3000,
  },
};
