/**
 * The UtilController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

import Controller from './Controller.js';
import service from '../services/UtilService.js';
const convert = async (request, response) => {
  await Controller.handleRequest(request, response, service.convert);
};

const getAddrsByXpubKey = async (request, response) => {
  await Controller.handleRequest(request, response, service.getAddrsByXpubKey);
};

const getXpubKeyInfo = async (request, response) => {
  await Controller.handleRequest(request, response, service.getXpubKeyInfo);
};


export default {
  convert,
  getAddrsByXpubKey,
  getXpubKeyInfo,
};
