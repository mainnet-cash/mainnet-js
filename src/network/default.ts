import { default as ElectrumNetworkProvider } from "./ElectrumNetworkProvider";
import { default as GrpcBchrpcNetworkProvider } from "./GrpcBchrpcNetworkProvider";

export function RegtestProvider() {
  return new GrpcBchrpcNetworkProvider("regtest");
}

export function TestnetProvider() {
  return new ElectrumNetworkProvider("testnet", undefined, false);
}

export function MainnetProvider() {
  return new ElectrumNetworkProvider(undefined, undefined, false);
}
