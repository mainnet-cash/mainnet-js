import { default as ElectrumNetworkProvider } from "./ElectrumNetworkProvider";

export function RegtestProvider() {
  return new ElectrumNetworkProvider("regtest", undefined, false);
}

export function TestnetProvider() {
  return new ElectrumNetworkProvider("testnet", undefined, false);
}

export function MainnetProvider() {
  return new ElectrumNetworkProvider(undefined, undefined, false);
}
