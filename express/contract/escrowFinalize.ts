import { Service } from "../../generated/serve/services/Service";

/**
* Finalize an escrow contract
*
* escrowFinalizeRequest EscrowFinalizeRequest 
* returns EscrowResponse
* */
export const escrowFinalize = ({ escrowFinalizeRequest }) => new Promise(
    async (resolve, reject) => {
      try {
        resolve(Service.successResponse({
          escrowFinalizeRequest,
        }));
      } catch (e) {
        reject(Service.rejectResponse(
          e.message || "Invalid input",
          e.status || 405,
        ));
      }
    },
  );