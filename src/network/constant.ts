import { ClusterOrder } from "electrum-cash";
import { Network } from "../interface";


export const networkTickerMap = {
  "mainnet": "BCH" ,
  "testnet": "BCHt", 
  "regtest": "BCHr", 
}

export const mainnetServers = [
  "https://fulcrum.fountainhead.cash:50002",
  //"https://bch.imaginary.cash:50002",
  //"wss://bch.imaginary.cash:50004",
  //"wss://electroncash.de:60002",
];

export const testnetServers = [
  //"wss://blackie.c3-soft.com:60004",
  "wss://electroncash.de:60004",
];

export const regtestServers = "ws://127.0.0.1:60003";

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
    timeout: 1000,
  },
};
