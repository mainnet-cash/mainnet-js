/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* Create a webhook to watch cashaddress balance and transactions. 
*
* watchAddressRequest WatchAddressRequest Based on the 'type' parameter the webhook will be triggered to either post balance or raw transactions to the 'url' - 'transaction:in' for incoming only, 'transaction:out' for outgoing only and 'transaction:in,out' both for incoming and outgoing transactions. 'balance' will post the object according to 'BalanceResponse' schema 
* returns WatchAddressResponse
* */
const watchAddress = ({ watchAddressRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const worker = await mainnet.WebhookWorker.instance();
      const id =  await worker.registerWebhook({ ...watchAddressRequest }, true);
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
  watchAddress,
};
