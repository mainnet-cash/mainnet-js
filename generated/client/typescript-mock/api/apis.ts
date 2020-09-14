export * from './contractApi';
import { ContractApi } from './contractApi';
export * from './walletApi';
import { WalletApi } from './walletApi';
import * as http from 'http';

export class HttpError extends Error {
    constructor (public response: http.IncomingMessage, public body: any, public statusCode?: number) {
        super('HTTP request failed');
        this.name = 'HttpError';
    }
}

export { RequestFile } from '../model/models';

export const APIS = [ContractApi, WalletApi];
