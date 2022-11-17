/**
 * The FaucetController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

import Controller from './Controller.js';
import service from '../services/FaucetService.js';
const getAddresses = async (request, response) => {
  await Controller.handleRequest(request, response, service.getAddresses);
};

const getTestnetBch = async (request, response) => {
  await Controller.handleRequest(request, response, service.getTestnetBch);
};

const getTestnetSbch = async (request, response) => {
  await Controller.handleRequest(request, response, service.getTestnetSbch);
};

const getTestnetSep20 = async (request, response) => {
  await Controller.handleRequest(request, response, service.getTestnetSep20);
};

const getTestnetSlp = async (request, response) => {
  await Controller.handleRequest(request, response, service.getTestnetSlp);
};


export default {
  getAddresses,
  getTestnetBch,
  getTestnetSbch,
  getTestnetSep20,
  getTestnetSlp,
};
