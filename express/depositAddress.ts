import { Service } from "../generated/serve/services/Service";

/**
* Get a deposit address in cash address format
*
* serializedWallet SerializedWallet Request for a deposit address given a wallet 
* returns DepositAddressResponse
* */
export const depositAddress = ({ serializedWallet }) => new Promise(
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