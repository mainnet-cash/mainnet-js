import { decodeAddress } from "bchaddrjs-slp";

export {
  toCashAddress,
  toSlpAddress,
  isValidAddress,
  isCashAddress,
  isSlpAddress,
  decodeAddress,
} from "bchaddrjs-slp";

// import bchaddr from "bchaddrjs-slp";

// export { isValidAddress, isCashAddress, isSlpAddress } from "bchaddrjs-slp";

// export function toCashAddress(address: string) {
//   if (["bchreg", "slpreg"].some(val => address.includes(val))) {
//     return bchaddr.toRegtestAddress(bchaddr.toCashAddress(address));
//   }

//   return bchaddr.toCashAddress(address);
// }

// export function toSlpAddress(address: string) {
//   if (["bchreg", "slpreg"].some(val => address.includes(val))) {
//     return bchaddr.toSlpRegtestAddress(address);
//   }

//   return bchaddr.toSlpAddress(address);
// }

export function isSameAddress(first: string, second: string) {
  let decodedFirst = decodeAddress(first);
  let decodedSecond = decodeAddress(second);

  // require strict match for mainnet and relax match for testnet and regtest
  const isStrict =
    decodedFirst.network === "Mainnet" || decodedSecond.network === "Mainnet";
  if (!isStrict) {
    delete (decodedFirst as any).network;
    delete (decodedSecond as any).network;
  }

  console.log(
    JSON.stringify(decodedFirst),
    JSON.stringify(decodedSecond),
    JSON.stringify(decodedFirst) === JSON.stringify(decodedSecond)
  );
  return JSON.stringify(decodedFirst) === JSON.stringify(decodedSecond);
}
