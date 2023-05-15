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
import ElectrumNetworkProvider from "../network/ElectrumNetworkProvider.js";
import { ElectrumRawTransaction } from "../network/interface.js";
import { IdentitySnapshot, Registry } from "./bcmr-v2.schema.js";
import { initProvider } from "../network/Connection.js";
import { OpReturnData } from "./model.js";

export interface AuthChainElement {
  txHash: string;
  contentHash: string;
  uris: string[];
  httpsUrl: string;
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
    if (uri.indexOf("https://") < 0) {
      uri = `https://${uri}`;
    }

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
   * The authchain in this implementation is specific to resolve to a valid metadata registry
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

    const provider = (await initProvider(
      options.network
    )!) as ElectrumNetworkProvider;

    if (options.rawTx === undefined) {
      options.rawTx = await provider.getRawTransactionObject(
        options.transactionHash
      );
    }

    // figure out the autchain by moving towards authhead
    const getAuthChainChild = async () => {
      const history =
        options.historyCache ||
        (await provider.getHistory(
          options.rawTx!.vout[0].scriptPubKey.addresses[0]
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
            options.rawTx!.vout[0].scriptPubKey.addresses[0] ===
            historyRawTx.vout[0].scriptPubKey.addresses[0]
              ? filteredHistory
              : undefined;

          // combine the authchain element with the rest obtained
          return { rawTx: historyRawTx, historyCache };
        }
      }
      return undefined;
    };

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
        spends0thOutput = electrumTransaction.vin.some((val) => val.vout === 0);
      } else {
        const libauthTransaction = rawTx as Transaction;
        opReturns = libauthTransaction.outputs
          .map((val) => binToHex(val.lockingBytecode))
          .filter((val) => val.indexOf("6a") === 0);
        spends0thOutput = libauthTransaction.inputs.some(
          (val) => val.outpointIndex === 0
        );
      }

      if (!spends0thOutput) {
        throw new Error(
          "Invalid authchain transaction (does not spend 0th output of previous transaction)"
        );
      }

      const bcmrOpReturns = opReturns.filter(
        (val) =>
          val.indexOf("6a0442434d52") === 0 ||
          val.indexOf("6a4c0442434d52") === 0 ||
          val.indexOf("6a4d040042434d52") === 0 ||
          val.indexOf("6a4e0400000042434d52") === 0
      );

      if (bcmrOpReturns.length === 0) {
        return {
          txHash: hash,
          contentHash: "",
          uris: [],
          httpsUrl: "",
        };
      }

      const opReturnHex = opReturns[0];
      const chunks = OpReturnData.parseBinary(hexToBin(opReturnHex));
      if (chunks.length < 2) {
        throw new Error(`Malformed BCMR output: ${opReturnHex}`);
      }

      const result: AuthChainElement = {
        txHash: hash,
        contentHash: "",
        uris: [],
        httpsUrl: "",
      };

      if (chunks.length === 2) {
        // IPFS Publication Output
        result.contentHash = binToHex(chunks[1]);
        const ipfsCid = binToUtf8(chunks[1]);
        result.uris = [`ipfs://${ipfsCid}`];
        result.httpsUrl = `https://dweb.link/ipfs/${ipfsCid}`;
      } else {
        // URI Publication Output
        // content hash is in OP_SHA256 byte order per spec
        result.contentHash = binToHex(chunks[1].slice());

        const uris = chunks.slice(2);

        for (const uri of uris) {
          const uriString = binToUtf8(uri);
          result.uris.push(uriString);

          if (result.httpsUrl) {
            continue;
          }

          if (uriString.indexOf("https://") === 0) {
            result.httpsUrl = uriString;
          } else if (uriString.indexOf("https://") === -1) {
            result.httpsUrl = uriString;

            // case for domain name specifier, like example.com
            if (uriString.indexOf("/") === -1) {
              result.httpsUrl = `${result.httpsUrl}/.well-known/bitcoin-cash-metadata-registry.json`
            }

            result.httpsUrl = `https://${result.httpsUrl}`;
          } else if (uriString.indexOf("ipfs://") === 0 ) {
            const ipfsCid = uriString.replace("ipfs://", "");
            result.httpsUrl = `https://dweb.link/ipfs/${ipfsCid}`
          } else {
            throw new Error(`Unsupported uri type: ${uriString}`)
          }
        }
      }
      return result;
    };

    // make authchain element and combine with the rest obtained
    let element: AuthChainElement;
    try {
      element = makeAuthChainElement(options.rawTx, options.rawTx.hash);
    } catch (error) {
      // special case for cashtoken authchain lookup by categoryId - allow to fail first lookup and inspect the genesis transaction
      // follow authchain to head and look for BCMR outputs
      const child = await getAuthChainChild();
      if (child) {
        return await BCMR.buildAuthChain({
          ...options,
          transactionHash: child.rawTx.hash,
          rawTx: child.rawTx,
          historyCache: child.historyCache,
        });
      } else {
        throw error;
      }
    }

    let chainBase: AuthChain = [];
    if (options.resolveBase) {
      // check for accelerated path if "authchain" extension is in registry
      const registry: Registry = await this.fetchMetadataRegistry(
        element.httpsUrl,
        element.contentHash
      );
      if (
        registry.extensions &&
        registry.extensions["authchain"] &&
        Object.keys(registry.extensions["authchain"]).length
      ) {
        const chainTxArray = Object.values(
          registry.extensions!["authchain"]
        ) as string[];

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
        let maxElements = 10;
        while (stop == false || maxElements === 0) {
          const vin = tx.vin.find((val) => val.vout === 0);
          tx = await provider.getRawTransactionObject(vin!.txid);
          try {
            const pastElement = makeAuthChainElement(tx, tx.hash);
            chainBase.unshift(pastElement);
            maxElements--;
          } catch {
            stop = true;
          }
        }
      }
    }

    // if we follow to head, we need to locate the next transaction spending our 0th output
    // and repeat the building process recursively
    if (options.followToHead) {
      const child = await getAuthChainChild();
      if (child) {
        const chainHead = await BCMR.buildAuthChain({
          transactionHash: child.rawTx.hash,
          network: options.network,
          rawTx: child.rawTx,
          historyCache: child.historyCache,
          followToHead: options.followToHead,
          resolveBase: false,
        });

        // combine the authchain element with the rest obtained
        return [...chainBase, element, ...chainHead].filter(
          (val) => val.httpsUrl.length
        );
      }
    }

    // return the last chain element (or the only found in an edge case)
    return [...chainBase, element].filter((val) => val.httpsUrl.length);
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

    if (!authChain.length) {
      throw new Error(
        `There were no BCMR entries in the resolved authchain ${JSON.stringify(
          authChain,
          null,
          2
        )}`
      );
    }

    const registry = await this.fetchMetadataRegistry(
      authChain.reverse()[0].httpsUrl
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
      const history = registry.identities?.[tokenId];
      if (!history) {
        continue;
      }
      const latestIdentityIndex = Object.keys(history)[0];
      if (latestIdentityIndex === undefined) {
        continue;
      }

      return history[latestIdentityIndex];
    }

    return undefined;
  }
}
