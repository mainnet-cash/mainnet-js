import { Service } from "../../generated/serve/services/Service";

/**
* Create an escrow contract
*
* escrowRequest EscrowRequest Request a new escrow contract
* returns EscrowResponse
* */
export const createEscrow = ({ escrowRequest }) => new Promise(
    async (resolve, reject) => {
      try {
        resolve(Service.successResponse({
          escrowRequest,
        }));
      } catch (e) {
        reject(Service.rejectResponse(
          e.message || "Invalid input",
          e.status || 405,
        ));
      }
    },
  );