/* eslint-disable no-unused-vars */
import { Service } from "./Service";

// @ts-ignore
import * as core from "express-serve-static-core";

/**
* Mine regtest coins to a specified address
*
* mineRequest MineRequest  (optional)
* returns List
* */
export const mine = ({ mineRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        mineRequest,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || "Invalid input",
        e.status || 405,
      ));
    }
  },
);
