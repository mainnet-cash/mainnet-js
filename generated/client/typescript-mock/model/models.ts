import localVarRequest from 'request';

export * from './amount';
export * from './balanceResponse';
export * from './cashaddr';
export * from './depositAddressResponse';
export * from './network';
export * from './outpoint';
export * from './portableNetworkGraphic';
export * from './sendMaxRequest';
export * from './sendMaxResponse';
export * from './sendRequest';
export * from './sendRequestItem';
export * from './sendResponse';
export * from './serializedWallet';
export * from './toCashaddr';
export * from './transactionId';
export * from './utxo';
export * from './utxoResponse';
export * from './walletRequest';
export * from './walletResponse';
export * from './walletType';
export * from './zeroBalanceResponse';

import * as fs from 'fs';

export interface RequestDetailedFile {
    value: Buffer;
    options?: {
        filename?: string;
        contentType?: string;
    }
}

export type RequestFile = string | Buffer | fs.ReadStream | RequestDetailedFile;


import { Amount } from './amount';
import { BalanceResponse } from './balanceResponse';
import { Cashaddr } from './cashaddr';
import { DepositAddressResponse } from './depositAddressResponse';
import { Network } from './network';
import { Outpoint } from './outpoint';
import { PortableNetworkGraphic } from './portableNetworkGraphic';
import { SendMaxRequest } from './sendMaxRequest';
import { SendMaxResponse } from './sendMaxResponse';
import { SendRequest } from './sendRequest';
import { SendRequestItem } from './sendRequestItem';
import { SendResponse } from './sendResponse';
import { SerializedWallet } from './serializedWallet';
import { ToCashaddr } from './toCashaddr';
import { TransactionId } from './transactionId';
import { Utxo } from './utxo';
import { UtxoResponse } from './utxoResponse';
import { WalletRequest } from './walletRequest';
import { WalletResponse } from './walletResponse';
import { WalletType } from './walletType';
import { ZeroBalanceResponse } from './zeroBalanceResponse';

/* tslint:disable:no-unused-variable */
let primitives = [
                    "string",
                    "boolean",
                    "double",
                    "integer",
                    "long",
                    "float",
                    "number",
                    "any"
                 ];

let enumsMap: {[index: string]: any} = {
        "Amount.UnitEnum": Amount.UnitEnum,
        "Network.NetworkEnum": Network.NetworkEnum,
        "SendRequestItem.UnitEnum": SendRequestItem.UnitEnum,
        "WalletRequest.TypeEnum": WalletRequest.TypeEnum,
        "WalletRequest.NetworkEnum": WalletRequest.NetworkEnum,
        "WalletResponse.NetworkEnum": WalletResponse.NetworkEnum,
        "WalletType.TypeEnum": WalletType.TypeEnum,
}

let typeMap: {[index: string]: any} = {
    "Amount": Amount,
    "BalanceResponse": BalanceResponse,
    "Cashaddr": Cashaddr,
    "DepositAddressResponse": DepositAddressResponse,
    "Network": Network,
    "Outpoint": Outpoint,
    "PortableNetworkGraphic": PortableNetworkGraphic,
    "SendMaxRequest": SendMaxRequest,
    "SendMaxResponse": SendMaxResponse,
    "SendRequest": SendRequest,
    "SendRequestItem": SendRequestItem,
    "SendResponse": SendResponse,
    "SerializedWallet": SerializedWallet,
    "ToCashaddr": ToCashaddr,
    "TransactionId": TransactionId,
    "Utxo": Utxo,
    "UtxoResponse": UtxoResponse,
    "WalletRequest": WalletRequest,
    "WalletResponse": WalletResponse,
    "WalletType": WalletType,
    "ZeroBalanceResponse": ZeroBalanceResponse,
}

export class ObjectSerializer {
    public static findCorrectType(data: any, expectedType: string) {
        if (data == undefined) {
            return expectedType;
        } else if (primitives.indexOf(expectedType.toLowerCase()) !== -1) {
            return expectedType;
        } else if (expectedType === "Date") {
            return expectedType;
        } else {
            if (enumsMap[expectedType]) {
                return expectedType;
            }

            if (!typeMap[expectedType]) {
                return expectedType; // w/e we don't know the type
            }

            // Check the discriminator
            let discriminatorProperty = typeMap[expectedType].discriminator;
            if (discriminatorProperty == null) {
                return expectedType; // the type does not have a discriminator. use it.
            } else {
                if (data[discriminatorProperty]) {
                    var discriminatorType = data[discriminatorProperty];
                    if(typeMap[discriminatorType]){
                        return discriminatorType; // use the type given in the discriminator
                    } else {
                        return expectedType; // discriminator did not map to a type
                    }
                } else {
                    return expectedType; // discriminator was not present (or an empty string)
                }
            }
        }
    }

    public static serialize(data: any, type: string) {
        if (data == undefined) {
            return data;
        } else if (primitives.indexOf(type.toLowerCase()) !== -1) {
            return data;
        } else if (type.lastIndexOf("Array<", 0) === 0) { // string.startsWith pre es6
            let subType: string = type.replace("Array<", ""); // Array<Type> => Type>
            subType = subType.substring(0, subType.length - 1); // Type> => Type
            let transformedData: any[] = [];
            for (let index in data) {
                let date = data[index];
                transformedData.push(ObjectSerializer.serialize(date, subType));
            }
            return transformedData;
        } else if (type === "Date") {
            return data.toISOString();
        } else {
            if (enumsMap[type]) {
                return data;
            }
            if (!typeMap[type]) { // in case we dont know the type
                return data;
            }

            // Get the actual type of this object
            type = this.findCorrectType(data, type);

            // get the map for the correct type.
            let attributeTypes = typeMap[type].getAttributeTypeMap();
            let instance: {[index: string]: any} = {};
            for (let index in attributeTypes) {
                let attributeType = attributeTypes[index];
                instance[attributeType.baseName] = ObjectSerializer.serialize(data[attributeType.name], attributeType.type);
            }
            return instance;
        }
    }

    public static deserialize(data: any, type: string) {
        // polymorphism may change the actual type.
        type = ObjectSerializer.findCorrectType(data, type);
        if (data == undefined) {
            return data;
        } else if (primitives.indexOf(type.toLowerCase()) !== -1) {
            return data;
        } else if (type.lastIndexOf("Array<", 0) === 0) { // string.startsWith pre es6
            let subType: string = type.replace("Array<", ""); // Array<Type> => Type>
            subType = subType.substring(0, subType.length - 1); // Type> => Type
            let transformedData: any[] = [];
            for (let index in data) {
                let date = data[index];
                transformedData.push(ObjectSerializer.deserialize(date, subType));
            }
            return transformedData;
        } else if (type === "Date") {
            return new Date(data);
        } else {
            if (enumsMap[type]) {// is Enum
                return data;
            }

            if (!typeMap[type]) { // dont know the type
                return data;
            }
            let instance = new typeMap[type]();
            let attributeTypes = typeMap[type].getAttributeTypeMap();
            for (let index in attributeTypes) {
                let attributeType = attributeTypes[index];
                instance[attributeType.name] = ObjectSerializer.deserialize(data[attributeType.baseName], attributeType.type);
            }
            return instance;
        }
    }
}

export interface Authentication {
    /**
    * Apply authentication settings to header and query params.
    */
    applyToRequest(requestOptions: localVarRequest.Options): Promise<void> | void;
}

export class HttpBasicAuth implements Authentication {
    public username: string = '';
    public password: string = '';

    applyToRequest(requestOptions: localVarRequest.Options): void {
        requestOptions.auth = {
            username: this.username, password: this.password
        }
    }
}

export class HttpBearerAuth implements Authentication {
    public accessToken: string | (() => string) = '';

    applyToRequest(requestOptions: localVarRequest.Options): void {
        if (requestOptions && requestOptions.headers) {
            const accessToken = typeof this.accessToken === 'function'
                            ? this.accessToken()
                            : this.accessToken;
            requestOptions.headers["Authorization"] = "Bearer " + accessToken;
        }
    }
}

export class ApiKeyAuth implements Authentication {
    public apiKey: string = '';

    constructor(private location: string, private paramName: string) {
    }

    applyToRequest(requestOptions: localVarRequest.Options): void {
        if (this.location == "query") {
            (<any>requestOptions.qs)[this.paramName] = this.apiKey;
        } else if (this.location == "header" && requestOptions && requestOptions.headers) {
            requestOptions.headers[this.paramName] = this.apiKey;
        } else if (this.location == 'cookie' && requestOptions && requestOptions.headers) {
            if (requestOptions.headers['Cookie']) {
                requestOptions.headers['Cookie'] += '; ' + this.paramName + '=' + encodeURIComponent(this.apiKey);
            }
            else {
                requestOptions.headers['Cookie'] = this.paramName + '=' + encodeURIComponent(this.apiKey);
            }
        }
    }
}

export class OAuth implements Authentication {
    public accessToken: string = '';

    applyToRequest(requestOptions: localVarRequest.Options): void {
        if (requestOptions && requestOptions.headers) {
            requestOptions.headers["Authorization"] = "Bearer " + this.accessToken;
        }
    }
}

export class VoidAuth implements Authentication {
    public username: string = '';
    public password: string = '';

    applyToRequest(_: localVarRequest.Options): void {
        // Do nothing
    }
}

export type Interceptor = (requestOptions: localVarRequest.Options) => (Promise<void> | void);
