/* eslint-disable no-unused-vars */
import { Service } from "./Service";

// @ts-ignore
import * as core from "express-serve-static-core";

/**
* Mine regtest coins to a specified address
*
* uNKNOWNUnderscoreBASEUnderscoreTYPE UNKNOWN_BASE_TYPE  (optional)
* returns List
* */
export const mine = ({ uNKNOWNUnderscoreBASEUnderscoreTYPE }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        uNKNOWNUnderscoreBASEUnderscoreTYPE,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || "Invalid input",
        e.status || 405,
      ));
    }
  },
);
