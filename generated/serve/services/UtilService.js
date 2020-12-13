/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* create a new wallet
*
* convertRequest ConvertRequest  (optional)
* returns BigDecimal
* */
const convert = ({ convertRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        convertRequest,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  convert,
};
