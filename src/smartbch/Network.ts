import { ethers } from "ethers";
import { NetworkType } from "../enum";

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
      // return new ethers.providers.WebSocketProvider(
      //   "wss://smartbch-wss.greyh.at",
      //   { name: "smartbch", chainId: 10000 }
      // );
      return new ethers.providers.JsonRpcProvider(
        "https://smartbch.fountainhead.cash/mainnet",
        { name: "smartbch", chainId: 10000 }
      );
    }
    case NetworkType.Testnet: {
      return new ethers.providers.JsonRpcProvider(
        "http://35.220.203.194:8545",
        // "https://moeing.tech:9545",
        { name: "smartbch", chainId: 10001 }
      );
    }
    default: {
      return new ethers.providers.StaticJsonRpcProvider(
        "http://127.0.0.1:8545",
        {
          name: "smartbch",
          chainId: 10002,
        }
      );
      // return new ethers.providers.WebSocketProvider(
      //   "ws://127.0.0.1:8546",
      //   {
      //     name: "smartbch",
      //     chainId: 10001,
      //   }
      // );
    }
  }
}
