/**
 * The ContractController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

import Controller from'./Controller.js';
import service from'../services/ContractService.js';
export const contractFn = async (request, response) => {
  await Controller.handleRequest(request, response, service.contractFn);
};

export const contractInfo = async (request, response) => {
  await Controller.handleRequest(request, response, service.contractInfo);
};

export const contractUtxos = async (request, response) => {
  await Controller.handleRequest(request, response, service.contractUtxos);
};

export const createContract = async (request, response) => {
  await Controller.handleRequest(request, response, service.createContract);
};
