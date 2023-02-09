import {
  binToHex,
  binToNumberUint16LE,
  binToUtf8,
  decodeTransaction,
  hexToBin,
  sha256,
  Transaction,
  utf8ToBin,
} from "@bitauth/libauth";
import axios from "axios";
import { Network, TxI } from "../interface.js";
import { getGlobalProvider } from "../network/default.js";
import ElectrumNetworkProvider from "../network/ElectrumNetworkProvider.js";
import { ElectrumRawTransaction } from "../network/interface.js";
import { IdentitySnapshot, Registry } from "./bcmr-v1.schema.js";

export interface AuthChainElement {
  txHash: string;
  contentHash: string;
  uri: string;
}

export type AuthChain = AuthChainElement[];

// Implementation of CHIP-BCMR v1.0.0, refer to https://github.com/bitjson/chip-bcmr
export class BCMR {
  // List of tracked registries
  public static metadataRegistries: Registry[] = [];

  public static getRegistries(): Registry[] {
    return this.metadataRegistries;
  }

  public static resetRegistries(): void {
    this.metadataRegistries = [];
  }

  /**
   * fetchMetadataRegistry Fetch the BCMR registry JSON file from a remote URI, optionally verifying its content hash
   *
   * @param  {string} uri URI of the registry to fetch from
   * @param  {string?} contentHash SHA256 hash of the resource the `uri` parameter points at.
   * If specified, calculates the hash of the data fetched from `uri` and matches it with provided one.
   * Yields an error upon mismatch.
   *
   * @returns {Registry} resolved registry
   */
  public static async fetchMetadataRegistry(
    uri: string,
    contentHash?: string
  ): Promise<Registry> {
    // content hashes HTTPS Publication Outputs per spec
    if (contentHash) {
      // request as text and verify hash
      const response = await axios.get(uri, {
        responseType: "text",
        transformResponse: (val) => {
          return val;
        },
      });
      const hash = binToHex(sha256.hash(utf8ToBin(response.data as string)));
      if (contentHash != hash) {
        throw new Error(
          `Content hash mismatch for URI: ${uri}\nreceived: ${hash}\nrequired: ${contentHash}`
        );
      }

      return JSON.parse(response.data) as Registry;
    }

    // request as JSON
    const response = await axios.get(uri);
    return response.data as Registry;
  }

  /**
   * addMetadataRegistry Add the metadata registry to the list of tracked registries
   *
   * @param  {Registry} registry Registry object per schema specification, see https://raw.githubusercontent.com/bitjson/chip-bcmr/master/bcmr-v1.schema.json
   *
   */
  public static addMetadataRegistry(registry: Registry): void {
    if (
      this.metadataRegistries.some(
        (val) => JSON.stringify(val) === JSON.stringify(registry)
      )
    ) {
      return;
    }
    this.metadataRegistries.push(registry);
  }

  /**
   * addMetadataRegistryFromUri Add the metadata registry by fetching a JSON file from a remote URI, optionally verifying its content hash
   *
   * @param  {string} uri URI of the registry to fetch from
   * @param  {string?} contentHash SHA256 hash of the resource the `uri` parameter points at.
   * If specified, calculates the hash of the data fetched from `uri` and matches it with provided one.
   * Yields an error upon mismatch.
   *
   */
  public static async addMetadataRegistryFromUri(
    uri: string,
    contentHash?: string
  ): Promise<void> {
    const registry = await this.fetchMetadataRegistry(uri, contentHash);
    this.addMetadataRegistry(registry);
  }

  /**
   * buildAuthChain Build an authchain - Zeroth-Descendant Transaction Chain, refer to https://github.com/bitjson/chip-bcmr#zeroth-descendant-transaction-chains
   * The authchain in this implementation is specific to resolve to a valid metadata registy
   *
   * @param  {string} options.transactionHash (required) transaction hash from which to build the auth chain
   * @param  {Network?} options.network (default=mainnet) network to query the data from
   * @param  {boolean?} options.resolveBase (default=false) boolean flag to indicate that autchain building should resolve and verify elements back to base or be stopped at this exact chain element
   * @param  {boolean?} options.followToHead (default=true) boolean flag to indicate that autchain building should progress to head or be stopped at this exact chain element
   * @param  {ElectrumRawTransaction?} options.rawTx cached raw transaction obtained previously, spares a Fulcrum call
   * @param  {TxI[]?} options.historyCache cached address history to be reused if authchain building proceeds with the same address, spares a flurry of Fulcrum calls
   *
   * @returns {AuthChain} returns the resolved authchain
   */
  public static async buildAuthChain(options: {
    transactionHash: string;
    network?: Network;
    resolveBase?: boolean;
    followToHead?: boolean;
    rawTx?: ElectrumRawTransaction;
    historyCache?: TxI[];
  }): Promise<AuthChain> {
    if (options.network === undefined) {
      options.network = Network.MAINNET;
    }

    if (options.followToHead === undefined) {
      options.followToHead = true;
    }

    if (options.resolveBase === undefined) {
      options.resolveBase = false;
    }

    const provider = getGlobalProvider(
      options.network
    ) as ElectrumNetworkProvider;
    if (!options.rawTx) {
      options.rawTx = await provider.getRawTransactionObject(
        options.transactionHash
      );
    }

    // helper function to enforce the constraints on the 0th output, decode the BCMR's OP_RETURN data
    // returns resolved AuthChainElement
    const makeAuthChainElement = (
      rawTx: ElectrumRawTransaction | Transaction,
      hash: string
    ): AuthChainElement => {
      let opReturns: string[];
      let spends0thOutput = false;
      if (rawTx.hasOwnProperty("vout")) {
        const electrumTransaction = rawTx as ElectrumRawTransaction;
        opReturns = electrumTransaction.vout
          .filter((val) => val.scriptPubKey.type === "nulldata")
          .map((val) => val.scriptPubKey.hex);
        spends0thOutput = electrumTransaction.vin[0].vout === 0;
      } else {
        const libauthTransaction = rawTx as Transaction;
        opReturns = libauthTransaction.outputs
          .map((val) => binToHex(val.lockingBytecode))
          .filter((val) => val.indexOf("6a") === 0);
        spends0thOutput = libauthTransaction.inputs[0].outpointIndex === 0;
      }

      const bcmrOpReturns = opReturns.filter(
        (val) =>
          val.indexOf("6a0442434d52") === 0 ||
          val.indexOf("6a4c0442434d52") === 0 ||
          val.indexOf("6a4d040042434d52") === 0 ||
          val.indexOf("6ade0400000042434d52") === 0
      );

      if (bcmrOpReturns.length === 0) {
        throw new Error("No BCMR OP_RETURN outputs found in the transaction");
      }

      if (!spends0thOutput) {
        throw new Error(
          "Invalid authchain transaction (does not spend 0th output of previous transaction)"
        );
      }

      const opReturnHex = opReturns[0];
      const opReturn = hexToBin(opReturnHex);
      const chunks: Uint8Array[] = [];
      let position = 1;

      // handle direct push, OP_PUSHDATA1, OP_PUSHDATA2;
      // OP_PUSHDATA4 is not supported in OP_RETURNs by consensus
      while (opReturn[position]) {
        let length = 0;
        if (opReturn[position] === 0x4c) {
          length = opReturn[position + 1];
          position += 2;
        } else if (opReturn[position] === 0x4d) {
          length = binToNumberUint16LE(
            opReturn.slice(position + 1, position + 3)
          );
          position += 3;
        } else {
          length = opReturn[position];
          position += 1;
        }

        chunks.push(opReturn.slice(position, position + length));
        position += length;
      }

      if (chunks.length < 2 || chunks.length > 3) {
        throw new Error(`Malformed BCMR output: ${opReturnHex}`);
      }

      const result: AuthChainElement = {
        txHash: hash,
        contentHash: "",
        uri: "",
      };

      if (chunks.length === 2) {
        // IPFS Publication Output
        result.contentHash = binToHex(chunks[1]);
        const ipfsCid = binToUtf8(chunks[1]);
        result.uri = `https://dweb.link/ipfs/${ipfsCid}`;
      } else {
        // HTTPS Publication Output
        // content hash is in OP_SHA256 byte order per spec
        result.contentHash = binToHex(chunks[1].slice().reverse());
        result.uri = binToUtf8(chunks[2]);
      }
      return result;
    };

    // make authchain element and combine with the rest obtained
    const element: AuthChainElement = makeAuthChainElement(
      options.rawTx,
      options.rawTx.hash
    );

    let chainBase: AuthChain = [];
    if (options.resolveBase) {
      // check for accelerated path if "authchain" extension is in registry
      const registry: Registry = await this.fetchMetadataRegistry(
        element.uri,
        element.contentHash
      );
      if (
        registry.extensions &&
        registry.extensions["authchain"] &&
        (registry.extensions["authchain"] as string[]).length
      ) {
        const chainTxArray = registry.extensions!["authchain"] as string[];

        chainBase = chainTxArray
          .map((tx) => {
            const transactionBin = hexToBin(tx);
            const decoded = decodeTransaction(transactionBin);
            if (typeof decoded === "string") {
              throw new Error(
                `Error decoding transaction ${JSON.stringify(tx)}, ${decoded}`
              );
            }
            const hash = binToHex(
              sha256.hash(sha256.hash(transactionBin)).reverse()
            );
            return { decoded, hash };
          })
          .map(({ decoded, hash }) => makeAuthChainElement(decoded, hash));
      } else {
        // simply go back in history towards authhead
        let stop = false;
        let tx: ElectrumRawTransaction = { ...options.rawTx! };
        while (stop == false) {
          tx = await provider.getRawTransactionObject(tx.vin[0].txid);
          try {
            const pastElement = makeAuthChainElement(tx, tx.hash);
            chainBase.unshift(pastElement);
          } catch {
            stop = true;
          }
        }
      }
    }

    // if we follow to head, we need to locate the next transaction spending our 0th output
    // and repeat the building process recursively
    if (options.followToHead) {
      // let's figure out the autchain by moving towards authhead
      const history =
        options.historyCache ||
        (await provider.getHistory(
          options.rawTx.vout[0].scriptPubKey.addresses[0]
        ));
      const thisTx = history.find(
        (val) => val.tx_hash === options.transactionHash
      );
      let filteredHistory = history.filter((val) =>
        val.height > 0
          ? val.height >= thisTx!.height || val.height <= 0
          : val.height <= 0 && val.tx_hash !== thisTx!.tx_hash
      );

      for (const historyTx of filteredHistory) {
        const historyRawTx = await provider.getRawTransactionObject(
          historyTx.tx_hash
        );
        const authChainVin = historyRawTx.vin.find(
          (val) => val.txid === options.transactionHash && val.vout === 0
        );
        // if we've found continuation of authchain, we shall recurse into it
        if (authChainVin) {
          // reuse queried address history if the next element in chain is the same address
          const historyCache =
            options.rawTx.vout[0].scriptPubKey.addresses[0] ===
            historyRawTx.vout[0].scriptPubKey.addresses[0]
              ? filteredHistory
              : undefined;
          // query next chain element
          const chainHead = await BCMR.buildAuthChain({
            transactionHash: historyRawTx.hash,
            network: options.network,
            rawTx: historyRawTx,
            historyCache: historyCache,
            followToHead: options.followToHead,
            resolveBase: false,
          });

          // combine the authchain element with the rest obtained
          return [...chainBase, element, ...chainHead];
        }
      }
    }

    // return the last chain element (or the only found in an edge case)
    return [...chainBase, element];
  }

  /**
   * addMetadataRegistryAuthChain Add BCMR metadata registry by resolving an authchain
   *
   * @param  {string} options.transactionHash (required) transaction hash from which to build the auth chain
   * @param  {Network?} options.network (default=mainnet) network to query the data from
   * @param  {boolean?} options.followToHead (default=true) boolean flag to indicate that autchain building should progress to head (most recent registry version) or be stopped at this exact chain element
   * @param  {ElectrumRawTransaction?} options.rawTx cached raw transaction obtained previously, spares a Fulcrum call
   *
   * @returns {AuthChain} returns the resolved authchain
   */
  public static async addMetadataRegistryAuthChain(options: {
    transactionHash: string;
    network?: Network;
    followToHead?: boolean;
    rawTx?: ElectrumRawTransaction;
  }): Promise<AuthChain> {
    const authChain = await this.buildAuthChain({
      ...options,
      resolveBase: false,
    });
    const registry = await this.fetchMetadataRegistry(
      authChain.reverse()[0].uri
    );

    this.addMetadataRegistry(registry);
    return authChain;
  }

  /**
   * getTokenInfo Return the token info (or the identity snapshot as per spec)
   *
   * @param  {string} tokenId token id to look up
   *
   * @returns {IdentitySnapshot?} return the info for the token found, otherwise undefined
   */
  public static getTokenInfo(tokenId: string): IdentitySnapshot | undefined {
    for (const registry of this.metadataRegistries.slice().reverse()) {
      // registry identity is an authbase string pointer
      if (typeof registry.registryIdentity === "string") {
        // enforce spec, ensure identites have this authbase
        if (registry.identities?.[registry.registryIdentity]) {
          // find the latest identity in history and add it to the list
          const latestIdentityInHistory = registry.identities![tokenId][0];
          if (latestIdentityInHistory) {
            return latestIdentityInHistory;
          }
        }
      } else {
        // if the token identity is the registry identity and categories match, return it
        if (registry.registryIdentity.token?.category === tokenId) {
          return registry.registryIdentity;
        }

        // find the latest identity in history and add it to the list
        const latestIdentityInHistory = registry.identities![tokenId][0];
        if (latestIdentityInHistory) {
          return latestIdentityInHistory;
        }
      }
    }

    return undefined;
  }
}
