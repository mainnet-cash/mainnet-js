import { Service } from "../generated/serve/services/Service";

/**
 * Get receiving cash address as a qrcode
 *
 * serializedWallet SerializedWallet Request for a deposit cash address as a Quick Response code (qrcode)
 * returns PortableNetworkGraphic
 * */
export const depositQr = ({ serializedWallet }) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          serializedWallet,
        })
      );
    } catch (e) {
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 405)
      );
    }
  });
