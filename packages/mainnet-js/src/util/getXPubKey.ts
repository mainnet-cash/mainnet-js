import {deriveHdPrivateNodeFromSeed,
    deriveHdPath,
    deriveHdPublicNode,
    encodeHdPublicKey,
    HdKeyNetwork,
    instantiateBIP32Crypto,
    hexToBin
} from "@bitauth/libauth"

export async function getXPubKey(seed:Uint8Array|string, derivationPath:string, network:string){
    if(typeof seed === "string"){
        seed = hexToBin(seed)
    }
    const crypto = await instantiateBIP32Crypto();
    let hdNode = deriveHdPrivateNodeFromSeed(crypto, seed);
    if (!hdNode.valid) {
      throw Error("Invalid private key derived from mnemonic seed");
    }

    let node = deriveHdPath(
      crypto,
      hdNode,
      derivationPath
    );
    if(typeof node === "string"){
      throw node
    }
    let parentPublicNode = deriveHdPublicNode(crypto, node)

    let xPubKey = encodeHdPublicKey(crypto, {
      network: network as HdKeyNetwork, 
      node: parentPublicNode
    });
    return xPubKey
}