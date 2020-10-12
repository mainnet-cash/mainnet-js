/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Mine regtest coins to a specified address
*
* mineRequest MineRequest  (optional)
* returns List
* */
const mine = ({ mineRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let args = mineRequest;
      let resp = await mineFn(args);
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
