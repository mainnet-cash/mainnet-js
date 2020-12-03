/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Create a new webhook to watch address transactions. 
*
* watchAddressRequest WatchAddressRequest Create a new webhook to watch address transactions
* returns WatchAddressResponse
* */
const watchAddressTranasctions = ({ watchAddressRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        watchAddressRequest,
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
