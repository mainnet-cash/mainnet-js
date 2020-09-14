/**
 * Mainnet Cash
 * A high-level developer friendly bitcoin cash wallet api This API is currently in active development, breaking changes may  be made prior to official release of version 1.  **Important:** modifying this library to prematurely operate on mainnet may result in loss of funds 
 *
 * The version of the OpenAPI document: 0.0.3
 * Contact: hello@mainnet.cash
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { RequestFile } from './models';

export class BalanceResponse {
    /**
    * Amount in whole Bitcoin Cash
    */
    'bch'?: number;
    /**
    * Amount in satoshis
    */
    'sat'?: number;
    /**
    * Amount in United States Dollars
    */
    'usd'?: number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "bch",
            "baseName": "bch",
            "type": "number"
        },
        {
            "name": "sat",
            "baseName": "sat",
            "type": "number"
        },
        {
            "name": "usd",
            "baseName": "usd",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return BalanceResponse.attributeTypeMap;
    }
}

