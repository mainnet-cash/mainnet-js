/* eslint-disable no-unused-vars */
import Service from './Service.js';
import * as mainnet from "mainnet-js";
/**
* Mine regtest coins to a specified address
*
* mineRequest MineRequest  (optional)
* returns List
* */
export const mine = ({ mineRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let resp = await mainnet.mine(mineRequest);
      resolve(Service.successResponse(resp));
    } catch (e) {
      console.trace(JSON.stringify(e))
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);

export default {
  mine,
};
