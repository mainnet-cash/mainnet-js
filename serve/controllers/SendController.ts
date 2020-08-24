/**
 * The SendController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic reoutes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
import * as service  from '../services/SendService';
export const sendRequest = async (request:any, response:any) => {
  await Controller.handleRequest(request, response, service.sendRequest);
};


