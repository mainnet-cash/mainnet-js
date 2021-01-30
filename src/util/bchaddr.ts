import bchaddr from "bchaddrjs-slp";

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

export { toCashAddress, toSlpAddress, isValidAddress } from "bchaddrjs-slp";
