/* eslint-disable no-unused-vars */
import Service from './Service.js';
import { WebhookWorker } from "@mainnet-cash/postgresql-storage";

/**
* Create a webhook to watch cashaddress balance and transactions. 
*
* watchAddressRequest WatchAddressRequest Based on the 'type' parameter the webhook will be triggered to either post balance or raw transactions to the 'url' - 'transaction:in' for incoming only, 'transaction:out' for outgoing only and 'transaction:in,out' both for incoming and outgoing transactions. 'balance' will post the object according to 'BalanceResponse' schema 
* returns WatchAddressResponse
* */
const watchAddress = ({ watchAddressRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const worker = await WebhookWorker.instance();
      const id =  await worker.registerWebhook({ ...watchAddressRequest }, true);
      resolve(Service.successResponse({
        id: id,
      }));
    } catch (e) {
      console.trace(e);
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

export default {
  watchAddress,
};
