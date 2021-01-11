/**
 * The ContractController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic reoutes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/ContractService');
const contractFn = async (request, response) => {
  await Controller.handleRequest(request, response, service.contractFn);
};

const createContract = async (request, response) => {
  await Controller.handleRequest(request, response, service.createContract);
};

const createEscrow = async (request, response) => {
  await Controller.handleRequest(request, response, service.createEscrow);
};

const escrowFn = async (request, response) => {
  await Controller.handleRequest(request, response, service.escrowFn);
};

const escrowUtxos = async (request, response) => {
  await Controller.handleRequest(request, response, service.escrowUtxos);
};


module.exports = {
  contractFn,
  createContract,
  createEscrow,
  escrowFn,
  escrowUtxos,
};
