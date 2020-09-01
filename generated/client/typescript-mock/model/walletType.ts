/**
 * Mainnet Cash
 * A developer friendly bitcoin cash wallet api  This API is currently in active development, breaking changes may be made prior to official release of version 1.  **Important:** modifying this library to prematurely operate on mainnet may result in loss of funds  
 *
 * The version of the OpenAPI document: 0.0.2
 * Contact: hello@mainnet.cash
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { RequestFile } from './models';

export class WalletType {
    /**
    * Wallet type, either a single wallet with private key (wif) or a Hierarchical Deterministic wallet determined from a seed.
    */
    'type'?: WalletType.TypeEnum;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "type",
            "baseName": "type",
            "type": "WalletType.TypeEnum"
        }    ];

    static getAttributeTypeMap() {
        return WalletType.attributeTypeMap;
    }
}

export namespace WalletType {
    export enum TypeEnum {
        Wif = <any> 'wif',
        Hd = <any> 'hd'
    }
}
