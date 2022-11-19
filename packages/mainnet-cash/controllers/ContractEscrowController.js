/**
 * The ContractEscrowController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

import Controller from './Controller.js';
import service from '../services/ContractEscrowService.js';
export const createEscrow = async (request, response) => {
  await Controller.handleRequest(request, response, service.createEscrow);
};

export const escrowFn = async (request, response) => {
  await Controller.handleRequest(request, response, service.escrowFn);
};

export const escrowInfo = async (request, response) => {
  await Controller.handleRequest(request, response, service.escrowInfo);
};

export const escrowUtxos = async (request, response) => {
  await Controller.handleRequest(request, response, service.escrowUtxos);
};
