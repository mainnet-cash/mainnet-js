/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* Create a new webhook to watch address transactions. 
*
* watchAddressRequest WatchAddressRequest Create a new webhook to watch address transactions
* returns WatchAddressResponse
* */
const watchAddressTranasctions = ({ watchAddressRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let id = await mainnet.watchAddressTranasctions({ ...watchAddressRequest })
      resolve(Service.successResponse({
        id: id,
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
  watchAddressTranasctions,
};
