import { ethers } from "ethers";
import { NetworkType } from "../enum";

export function getNetworkProvider(network: NetworkType = NetworkType.Mainnet): ethers.providers.BaseProvider {
  switch (network) {
    case NetworkType.Mainnet: {
      return new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");
    }
    case NetworkType.Testnet: {
      return new ethers.providers.JsonRpcProvider("http://35.220.203.194:8545", { name: "smartbch", chainId: 10001 });
    }
    default: {
      return new ethers.providers.JsonRpcProvider("http://localhost:8545");
    }
  }
}