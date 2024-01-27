export const DELIMITER = ":";

// Min amount utxo can be to be accepted by the network
export const DUST_UTXO_THRESHOLD = 546;

// Current chained tx limit
export const MEMPOOL_CHAIN_LIMIT = 50;

// time in milliseconds to cache the usd exchange rate
export const EXCHANGE_RATE_TTL = 250000;

// list of common derivation paths
// a la: https://github.com/Electron-Cash/Electron-Cash/blob/1de24c509992cfebc22217a2a77c862c2b02bc54/electroncash_gui/qt/installwizard.py#L624
export const DERIVATION_PATHS = [
  "m/0",
  "m/0'",
  "m/0'/0",
  "m/0'/0'",
  "m/0'/0'/0'",
  "m/44'/0'/0'",
  "m/44'/0'/0'/0",
  "m/44'/145'/0'",
  "m/44'/145'/0'/0",
  "m/44'/245'/0",
  "m/44'/245'/0'",
  "m/44'/245'/0'/0",
];


// import { sha256, binToHex, utf8ToBin } from "@bitauth/libauth";

// import { wordlist as czech } from '@scure/bip39/wordlists/czech';
// import { wordlist as english } from '@scure/bip39/wordlists/english';
// import { wordlist as french } from '@scure/bip39/wordlists/french';
// import { wordlist as italian } from '@scure/bip39/wordlists/italian';
// import { wordlist as japanese } from '@scure/bip39/wordlists/japanese';
// import { wordlist as korean } from '@scure/bip39/wordlists/korean';
// import { wordlist as portuguese } from '@scure/bip39/wordlists/portuguese';
// import { wordlist as simplifiedChinese } from '@scure/bip39/wordlists/simplified-chinese';
// import { wordlist as spanish } from '@scure/bip39/wordlists/spanish';
// import { wordlist as traditionalChinese } from '@scure/bip39/wordlists/traditional-chinese';

// let checks = {}
// let wordlists = {
//     "czech": czech,
//     "english": english,
//     "french": french,
//     "italian": italian,
//     "japanese": japanese,
//     "korean": korean,
//     "portuguese": portuguese,
//     "simplifiedChinese": simplifiedChinese,
//     "spanish": spanish, 
//     "traditionalChinese": traditionalChinese
// }
// for (let l in wordlists) {
//     checks[l] = binToHex(sha256.hash(utf8ToBin(wordlists[l].join(" "))))
// }

// console.log(checks)

export const WORDLIST_CHECKSUMS = {
  czech: '92e035ca0e3680fab85fa18b9e5c7e7582b3bd9caeb6d4bc8a2ecc8e492100c9',
  english: 'f18b9a84c83e38e98eceb0102b275e26438af83ab08f080cdb780a2caa9f3a6d',
  french: 'fd4cd57c8e86a99ac53cd0f21a6b89af366769b0143ac0d268ac7d7a39200145',
  italian: 'd9664953fe4c49e0b40eb6f6378c421f5f01dc9360aaac6d2a3c294f046ef520',
  japanese: 'e641781d89213031233ebc5130020c3de297cad96065ecc688d1c00e010ea71c',
  korean: '0c26059ed7ede977d7fa1c40443e71793e7850aa6a3d8aabf0cbcec91c1f95ec',
  portuguese: '85fea658f90c42c182823807a1d30db587abb72c14a3098e1a65f8b78d1ffcf4',
  simplifiedChinese: 'a86e2bd870e228d19a887c9faae8c1374b4e624e85d2b245b59e36583cba4afc',
  spanish: '27e99ad4328299108663c19eb611310bd3b77260af852169108713019831d07d',
  traditionalChinese: '11ef479f2f44b6d4f7fb6239dff06e3cd7a1473b83df6cf91adcbbbee598acf6'
}