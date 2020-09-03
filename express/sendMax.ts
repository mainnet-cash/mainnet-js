import { Service } from "../generated/serve/services/Service";

/**
* Send all available funds to a given address
*
* sendMaxRequest SendMaxRequest Request to all available funds to a given address
* returns SendMaxResponse
* */
export const sendMax = ({ sendMaxRequest }) => new Promise(
    async (resolve, reject) => {
      try {
        resolve(Service.successResponse({
          sendMaxRequest,
        }));
      } catch (e) {
        reject(Service.rejectResponse(
          e.message || "Invalid input",
          e.status || 405,
        ));
      }
    },
  );