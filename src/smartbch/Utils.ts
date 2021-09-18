import { ethers } from "ethers";
import { UnitEnum } from "../enum";
import { CancelWatchFn, SendRequest, SendRequestArray } from "./interface";

export function zeroAddress() {
  return "0x0000000000000000000000000000000000000000";
}

export function satToWei(value: number): ethers.BigNumber {
  return ethers.BigNumber.from(value).mul(ethers.BigNumber.from(10 ** 10));
}

export function weiToSat(value: ethers.BigNumberish): number {
  return ethers.BigNumber.from(value)
    .div(ethers.BigNumber.from(10 ** 10))
    .toNumber();
}

export function asSendRequestObject(
  requests: SendRequest | SendRequest[] | SendRequestArray[]
) {
  let resp: Array<SendRequest> = [];
  if (Array.isArray(requests)) {
    requests.forEach((r: SendRequest | SendRequestArray) => {
      // the SendRequestArray[] case
      if (Array.isArray(r)) {
        // ['address', 120, 'sats'],
        resp.push({
          address: r[0] as string,
          value: r[1] as number,
          unit: r[2] as UnitEnum,
        });
      } else {
        // SendRequest case
        resp.push(convertToClass(r));
      }
    });
  } else {
    // the SendRequest object case
    resp.push(convertToClass(requests as SendRequest));
  }
  return resp;
}

export function convertToClass(object: SendRequest) {
  if (object.hasOwnProperty("address")) {
    return object as SendRequest;
  }

  throw new Error("Unsupported send object");
}

// waiting for any address transaction using an ethers provider
function watchAddressMempool(
  provider: ethers.providers.BaseProvider,
  address: string,
  callback: (tx: ethers.providers.TransactionResponse) => void
): CancelWatchFn {
  const mempoolHandler = async (txHash: string) => {
    const tx = await provider.getTransaction(txHash);
    if (tx.to! === address || tx.from! === address) {
      callback(tx);
    }
  };

  provider.on("pending", mempoolHandler);

  return async () => {
    provider.removeListener("pending", mempoolHandler);
  };
}

export function watchAddress(
  provider: ethers.providers.BaseProvider,
  address: string,
  callback: (txHash: string) => void
): CancelWatchFn {
  return watchAddressTransactions(provider, address, (tx) => {
    callback(tx.hash);
  });
}

export function watchAddressTransactions(
  provider: ethers.providers.BaseProvider,
  address: string,
  callback: (tx: ethers.providers.TransactionResponse) => void
): CancelWatchFn {
  const blockHandler = async (blockNumber: number) => {
    const block = await provider.getBlockWithTransactions(blockNumber);
    for (const tx of block.transactions) {
      if (tx.to! === address || tx.from! === address) {
        callback(tx);
      }
    }
  };

  provider.on("block", blockHandler);

  return async () => {
    provider.removeListener("block", blockHandler);
  };
}

export function watchBlocks(
  provider: ethers.providers.BaseProvider,
  callback: (block: ethers.providers.Block) => void
): CancelWatchFn {
  const blockHandler = async (blockNumber: number) => {
    const block = await provider.getBlock(blockNumber);
    callback(block);
  };

  provider.on("block", blockHandler);

  return async () => {
    provider.removeListener("block", blockHandler);
  };
}

export async function waitForBlock(
  provider: ethers.providers.BaseProvider,
  targetBlockNumber?: number
): Promise<ethers.providers.Block> {
  return new Promise((resolve) => {
    const watchCancel = watchBlocks(provider, async (block) => {
      if (
        targetBlockNumber === undefined ||
        block.number >= targetBlockNumber!
      ) {
        await watchCancel();
        resolve(block);
      }
    });
  });
}

export function isValidAddress(address: string): boolean {
  return ethers.utils.isAddress(address);
}
