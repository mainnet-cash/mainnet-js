import { Service } from "../generated/serve/services/Service";

/**
* Get detailed information about unspent outputs (utxos)
*
* serializedWallet SerializedWallet Request detailed list of unspent transaction outputs 
* returns UtxoResponse
* */
export const utxos = ({ serializedWallet }) => new Promise(
    async (resolve, reject) => {
      try {
        resolve(Service.successResponse({
          serializedWallet,
        }));
      } catch (e) {
        reject(Service.rejectResponse(
          e.message || "Invalid input",
          e.status || 405,
        ));
      }
    },
  );