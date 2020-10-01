/**
 * Mainnet Cash
 * A high-level developer friendly bitcoin cash wallet api This API is currently in active development, breaking changes may  be made prior to official release of version 1. 
 *
 * The version of the OpenAPI document: 0.0.3
 * Contact: hello@mainnet.cash
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { RequestFile } from './models';

export class Cashaddr {
    'cashaddr'?: string;

    static discriminator: string | undefined = "cashaddr";

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "cashaddr",
            "baseName": "cashaddr",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return Cashaddr.attributeTypeMap;
    }
}

