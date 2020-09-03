import { Service } from "../generated/serve/services/Service";

/**
* Get maximum spendable amount
*
* maxAmountToSendRequest MaxAmountToSendRequest get amount that will be spend with a spend max request
* returns BalanceResponse
* */
export const maxAmountToSend = ({ maxAmountToSendRequest }) => new Promise(
    async (resolve, reject) => {
      try {
        resolve(Service.successResponse({
          maxAmountToSendRequest,
        }));
      } catch (e) {
        reject(Service.rejectResponse(
          e.message || "Invalid input",
          e.status || 405,
        ));
      }
    },
  );