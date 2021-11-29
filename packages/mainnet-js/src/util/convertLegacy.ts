import {
  instantiateSha256,
  decodeBase58Address,
  encodeCashAddress,
  CashAddressNetworkPrefix,
  CashAddressType,
} from "@bitauth/libauth";

/**
 * convertLegacy, utility function to convert base58 encoded bitcoin address to cashaddress
 *
 * @param legacyAddress   base58 encoded address
 * @param prefix          Address prefix as string, if non-standard
 *
 * @returns a cashaddr
 */
export async function convertLegacy(legacyAddress, prefix = "") {
  const sha256Promise = instantiateSha256();
  const sha256 = await sha256Promise;
  const decodedBase58Address = decodeBase58Address(sha256, legacyAddress);

  if (typeof decodedBase58Address === "string") {
    throw new Error(decodedBase58Address);
  } else {
    let type;
    switch (decodedBase58Address.version) {
      case 0:
        type = CashAddressType.P2PKH;
        prefix = prefix ? prefix : CashAddressNetworkPrefix.mainnet;
        break;
      case 5:
        type = CashAddressType.P2SH;
        prefix = prefix ? prefix : CashAddressNetworkPrefix.mainnet;
        break;
      case 111:
        type = CashAddressType.P2PKH;
        prefix = prefix ? prefix : CashAddressNetworkPrefix.testnet;
        break;
      case 196:
        type = CashAddressType.P2SH;
        prefix = prefix ? prefix : CashAddressNetworkPrefix.testnet;
        break;
      default:
        throw new Error(
          `Address type not recognized: ${decodedBase58Address.version}`
        );
    }
    let cashAddress = encodeCashAddress(
      prefix,
      type,
      decodedBase58Address.payload
    );
    // if unprefixed, remove prepending colon.
    return cashAddress[0] === ":" ? cashAddress.substring(1) : cashAddress;
  }
}

/**
 * convertLegacyObject, wrapper to convert requests passed as an object.
 *
 * @param convertLegacyRequest the legacyAddress and prefix as an object
 *
 * @returns a cashaddr
 */
export async function convertLegacyObject({
  legacyAddress,
  prefix,
}: {
  legacyAddress: string;
  prefix: any;
}) {
  return await convertLegacy(legacyAddress, prefix);
}
