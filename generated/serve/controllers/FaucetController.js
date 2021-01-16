/**
 * The FaucetController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic reoutes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/FaucetService');
const getAddresses = async (request, response) => {
  await Controller.handleRequest(request, response, service.getAddresses);
};

const getTestnetBch = async (request, response) => {
  await Controller.handleRequest(request, response, service.getTestnetBch);
};

const getTestnetSlp = async (request, response) => {
  await Controller.handleRequest(request, response, service.getTestnetSlp);
};


module.exports = {
  getAddresses,
  getTestnetBch,
  getTestnetSlp,
};
