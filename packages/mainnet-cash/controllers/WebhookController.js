/**
 * The WebhookController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

import Controller from './Controller.js';
import service from '../services/WebhookService.js';
export const watchAddress = async (request, response) => {
  await Controller.handleRequest(request, response, service.watchAddress);
};
