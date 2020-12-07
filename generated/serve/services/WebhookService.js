/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* Create a new webhook to watch address transactions. 
*
* watchAddressRequest WatchAddressRequest Create a new webhook to watch address transactions
* returns WatchAddressResponse
* */
const watchAddress = ({ watchAddressRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let id = await mainnet.watchAddress({ ...watchAddressRequest })
      resolve(Service.successResponse({
        id: id,
      }));
    } catch (e) {
      console.log(e, e.message, e.stack);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  watchAddress,
};
