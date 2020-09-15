import { 
    instantiateRipemd160, 
    instantiateSha256,
    
 } from "@bitauth/libauth";

const ripemd160Promise = instantiateRipemd160();
const sha256Promise = instantiateSha256();

export async function cashToHash160(cashaddr:string){
    

    const sha256 = await sha256Promise;
    const ripemd160 = await ripemd160Promise;
}
