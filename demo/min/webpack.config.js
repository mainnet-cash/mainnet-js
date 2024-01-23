// module.exports = {
//     resolve:{
//         fallback:{
//             "stream": require.resolve("stream-browserify"),
//             "crypto": require.resolve('crypto-browserify'),
//         }
//     }
// }

module.exports = {
    resolve:{
        fallback:{

            // mainnet-js
            "stream": require.resolve("stream-browserify"), // for bip39
            "net":false, // electrum-cash
            "tls":false, // electrum-cash

            // @mainnet-cash/contract
            "fs":false,    // cashscript/utils
            "url":false,   // cashscript/bitcoind-rpc
            "https":false, // cashscript/bitcoind-rpc
            "http":false,  // cashscript/bitcoind-rpc

        }
    }
}