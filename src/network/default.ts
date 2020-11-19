import { default as ElectrumProvider } from "./ElectrumNetworkProvider";
import {
  ElectrumCluster,
  ElectrumTransport,
  ClusterOrder,
  ElectrumClient,
} from "electrum-cash";
import { Network } from "../interface";

export function getNetworkProvider(network = "mainnet") {
  switch (network) {
    case Network.MAINNET:
      return getProvider();
    case Network.TESTNET:
      return getTestnetProvider();
    case Network.REGTEST:
      return getRegtestProvider();
    default:
      return getProvider();
  }
}
export function getRegtestProvider() {
  let client = getRegtestClient();
  return new ElectrumProvider(client, "regtest");
}

export function getTestnetProvider() {
  let cluster = getTestnetCluster();
  return new ElectrumProvider(cluster, "testnet");
}

export function getProvider() {
  let cluster = getCluster();
  return new ElectrumProvider(cluster, "mainnet");
}

function getConfidence() {
  // Allow users to configure the cluster confidence
  let confidence;
  if (typeof process !== "undefined") {
    confidence = process.env.CLUSTER_CONFIDENCE
      ? process.env.CLUSTER_CONFIDENCE
      : 1;
  } else {
    confidence = 1;
  }
  return confidence;
}

function getCluster() {
  let confidence = getConfidence();
  let electrum = new ElectrumCluster(
    "Mainnet",
    "1.4.1",
    confidence,
    3,
    ClusterOrder.PRIORITY,
    550
  );
  electrum.addServer(
    "fulcrum.fountainhead.cash",
    50002,
    ElectrumTransport.TCP_TLS.Scheme,
    false
  );
  electrum.addServer(
    "bch.imaginary.cash",
    50002,
    ElectrumTransport.TCP_TLS.Scheme,
    false
  );
  electrum.addServer(
    "bch.imaginary.cash",
    50004,
    ElectrumTransport.WSS.Scheme,
    false
  );
  electrum.addServer(
    "electroncash.de",
    60002,
    ElectrumTransport.WSS.Scheme,
    false
  );
  return electrum;
}

function getTestnetCluster() {
  let confidence = getConfidence();
  // Initialize a 1-of-2 Electrum Cluster with 2 hardcoded servers
  let electrum = new ElectrumCluster(
    "CashScript Application",
    "1.4.1",
    confidence,
    1,
    undefined
  );
  electrum.addServer(
    "blackie.c3-soft.com",
    60004,
    ElectrumTransport.WSS.Scheme,
    false
  );
  electrum.addServer(
    "electroncash.de",
    60004,
    ElectrumTransport.WSS.Scheme,
    false
  );
  return electrum;
}

function getRegtestClient() {
  //
  let electrum = new ElectrumClient(
    "CashScript Application",
    "1.4.1",
    "127.0.0.1",
    60003,
    ElectrumTransport.WS.Scheme,
    1020
  );
  return electrum;
}
