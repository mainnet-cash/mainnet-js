import { UnitType } from "../wallet/Base"

export function balanceResponseFromSatoshi(value:number, attribMap: any){
    let response = {}
    for(let a of attribMap.getAttributeTypeMap()){
        switch(UnitType.UnitEnum[a.name]){
            case('bch'):
               response = Object.assign({'bch':(value/10e8)}, response)
               break;
            case('sat'):
               response = Object.assign({'sat':(value)}, response)   
               break;
            case('usd'):
               response = Object.assign({'usd':"na"}, response)     
               break;
            default:
               response = Object.assign({'na':"na"}, response)     
        }
    }
    return response
}