/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("../lib/mainnet/mainnet-node-0.0.1-rc");
/**
* Mine regtest coins to a specified address
*
* mineRequest MineRequest  (optional)
* returns List
* */
const mine = ({ mineRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let resp = await mainnet.mine(mineRequest);
      resolve(Service.successResponse(resp));
    } catch (e) {
      console.log(e);
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 500)
      );
    }
  },
);

module.exports = {
  mine,
};
