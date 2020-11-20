import { default as ElectrumNetworkProvider } from "./ElectrumNetworkProvider";
import {
  ElectrumCluster,
  ElectrumTransport,
  ClusterOrder,
  ElectrumClient,
} from "electrum-cash";
import { Network } from "../interface";
import { emitWarning } from "process";

export function persistentNetwork(network="mainnet", useCluster=false){
  let provider = getNetworkProvider(network, useCluster)
}

export function getNetworkProvider(network = "mainnet", useCluster=false) {
  switch (network) {
    case Network.MAINNET:
      return getProvider(useCluster);
    case Network.TESTNET:
      return getTestnetProvider(useCluster);
    case Network.REGTEST:
      return getRegtestProvider(useCluster);
    default:
      return getProvider(useCluster);
  }
}

export function getRegtestProvider(useCluster:boolean) {
  if(useCluster){
    throw emitWarning("The regtest provider will only use a single client")
  }
  let c = getRegtestClient();
  return new ElectrumNetworkProvider(c, "regtest");
}

export function getTestnetProvider(useCluster:boolean) {
  let c = useCluster? getTestnetCluster() : getTestnetClient();
  return new ElectrumNetworkProvider(c, "testnet");
}

export function getProvider(useCluster:boolean) {
  let c = useCluster ? getClient() : getClient();
  return new ElectrumNetworkProvider(c, "mainnet");
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

function getClient() {
  //
  let electrum = new ElectrumClient(
    "CashScript Application",
    "1.4.1",
    "bch.imaginary.cash",
    50002,
    ElectrumTransport.TCP_TLS.Scheme,
    28020
  );
  return electrum;
}

function getTestnetClient() {
  //
  let electrum = new ElectrumClient(
    "CashScript Application",
    "1.4.1",
    "electroncash.de",
    60004,
    ElectrumTransport.WSS.Scheme,
    1020
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
    28020
  );
  return electrum;
}
