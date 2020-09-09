const fetch = require("node-fetch");

export async function getUsdRate() : Promise<number> {
    try{
          let response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd")
          let data = await response.json()
          return data["bitcoin-cash"].usd;          
      }catch(e){
        throw Error(e)
      }
}

