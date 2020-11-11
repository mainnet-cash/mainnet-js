import { derivePrefix } from "../util/derivePublicKeyHash";
import { networkPrefixMap } from "../enum"

export function derivedNetwork(addresses: string[]) {

    let networks = addresses.map(address => networkPrefixMap[derivePrefix(address)])
    // Get a unique set of networks requested
    let networkSet = new Set(networks)
    if( networkSet.size > 1){
        throw Error("Contract addresses are not on the same network")
    }else if ( networkSet.size === 0 ){
        throw Error("No address network was derived")
    }else{
        return [ ... networkSet.values()][0]
    }
  }