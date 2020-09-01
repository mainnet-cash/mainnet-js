export * from './infoApi';
import { InfoApi } from './infoApi';
export * from './sendApi';
import { SendApi } from './sendApi';
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

export const APIS = [InfoApi, SendApi, WalletApi];
