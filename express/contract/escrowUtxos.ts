import { Service } from "../../generated/serve/services/Service";

/**
* List specific utxos in a contract
* Returns all UTXOs that can be spent by the  contract. Both confirmed and unconfirmed UTXOs are included. 
*
* contract Contract 
* returns UtxoResponse
* */
export const escrowUtxos = ({ contract }) => new Promise(
    async (resolve, reject) => {
      try {
        resolve(Service.successResponse({
          contract,
        }));
      } catch (e) {
        reject(Service.rejectResponse(
          e.message || "Invalid input",
          e.status || 405,
        ));
      }
    },
  );
  