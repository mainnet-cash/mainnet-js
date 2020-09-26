import NetworkProvider from "./NetworkProvider"
import { Network, Utxo } from "../interface"
import { GrpcClient } from "grpc-bchrpc-node";
import { UnspentOutput } from "grpc-bchrpc-node/pb/bchrpc_pb";
import {
    binToHex
} from "@bitauth/libauth";


export default class GrpcBchrpcNetworkProvider implements NetworkProvider {

    private client: GrpcClient

    constructor(
        public network: Network = Network.MAINNET,
        client?: GrpcClient,
        url?: string
    ) {
        // If a custom GrpcBchrpc service is passed, we use it instead of the default.
        if (client) {
            this.client = client;
            return;
        }

        if (network === Network.MAINNET) {
            // Initialize a mainnet client
            url = url ? url : "https://bchd.greyh.at:8335";
            this.client = new GrpcClient({
                url: url,
                testnet: false,
                options: {
                    "grpc.max_receive_message_length": -1,
                },
            });
        } else if (network === Network.TESTNET) {
            // Initialize a testnet client
            url = url ? url : "https://bchd-testnet.greyh.at:18335";
            this.client = new GrpcClient({
                url: url,
                testnet: true,
                options: {
                    "grpc.max_receive_message_length": -1,
                },
            });
        } else if (network === Network.REGTEST) {
            // Initialize a regtest client using node env variables
            url = url ? url : `${process.env.HOST_IP}:${process.env.GRPC_PORT}`;
            const cert = `${process.env.BCHD_BIN_DIRECTORY}/${process.env.RPC_CERT}`;
            const host = `${process.env.HOST}`;
            this.client = new GrpcClient({
                url: url,
                testnet: true,
                rootCertPath: cert,
                options: {
                    "grpc.ssl_target_name_override": host,
                    "grpc.default_authority": host,
                    "grpc.max_receive_message_length": -1,
                },
            });
        }
        else {
            throw new Error(`Tried to instantiate an ElectrumNetworkProvider for unknown network ${network}`);
        }
    }

    async getUtxos(address: string): Promise<Utxo[]> {
        const result = await this.client.getAddressUtxos({
            address: address,
            includeMempool: true,
        });

        const utxos = (result.getOutputsList() || []).map((utxo: UnspentOutput) => ({
            txid: binToHex(utxo.getOutpoint()!.getHash_asU8()!.reverse()),
            vout: utxo.getOutpoint()!.getIndex()!,
            satoshis: utxo.getValue(),
            height: utxo.getBlockHeight(),
            coinbase: utxo.getIsCoinbase(),
        }));

        return utxos;
    }

    async getBlockHeight(): Promise<number> {
        let response = this.client!.getBlockchainInfo();
        return response.then((r) => {
            return r.getBestHeight()
        })
    }

    async getRawTransaction(txid: string): Promise<string> {
        let rawTx = this.client.getRawTransaction({ hash: txid })
        return rawTx.then((r) => {
            return binToHex(r.getTransaction_asU8())
        })
    }


    async sendRawTransaction(txHex: string): Promise<string> {
        let txnResponse = this.client.submitTransaction({ txnHex: txHex })
        return txnResponse.then((r) => {
            return binToHex(r.getHash_asU8())
        })
    }
}


