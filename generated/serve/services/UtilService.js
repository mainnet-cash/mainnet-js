/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* convert value base units
*
* convertRequest ConvertRequest  (optional)
* returns BigDecimal
* */
const convert = ({ convertRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let resp = await mainnet.convertObject(convertRequest)
      resolve(Service.successResponse(resp.toString()));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);

module.exports = {
  convert,
};
