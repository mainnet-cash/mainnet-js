/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

/**
* Create a webhook to watch address balance and transactions.
*
* watchAddressRequest WatchAddressRequest Based on the 'type' parameter the webhook will be triggered to either post balance or raw transactions to the 'url' - 'transaction:in' for incoming only, 'transaction:out' for outgoing only and 'transaction:in,out' both for incoming and outgoing transactions. 'balance' will post the object according to 'BalanceResponse' schema
* returns WatchAddressResponse
* */
const watchAddressTranasctions = ({ watchAddressRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let network = process.env.JEST_WORKER_ID === undefined ? mainnet.Network.MAINNET : mainnet.Network.REGTEST;

      const worker = new mainnet.WebhookWorker(network);
      const id =  await worker.registerWebhook({ ...watchAddressRequest }, false);
      await worker.destroy();
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
  watchAddressTranasctions,
};
