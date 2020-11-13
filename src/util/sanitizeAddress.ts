import {derivePrefix} from "./derivePublicKeyHash"

export function sanitizeAddress(address: string){
    if(address.includes(":")){
        return address
    }else{
        return `${derivePrefix(address)}:${address}`
    }
}
