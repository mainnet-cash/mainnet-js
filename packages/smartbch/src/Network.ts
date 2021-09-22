import { ethers } from "ethers";
import { NetworkType } from "mainnet-js";

export function getNetworkProvider(
  network: NetworkType = NetworkType.Mainnet
): ethers.providers.BaseProvider {
  switch (network as any) {
    case "EthMainnet": {
      return new ethers.providers.JsonRpcProvider(
        "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
      );
    }
    case NetworkType.Mainnet: {
      return new ethers.providers.WebSocketProvider(
        "wss://smartbch-wss.greyh.at",
        { name: "smartbch", chainId: 10000 }
      );
    }
    case NetworkType.Testnet: {
      return new ethers.providers.JsonRpcProvider(
        "http://35.220.203.194:8545",
        { name: "smartbch", chainId: 10001 }
      );
    }
    default: {
      return new ethers.providers.StaticJsonRpcProvider(
        "http://localhost:8545",
        {
          name: "smartbch",
          chainId: 10001,
        }
      );
    }
  }
}
