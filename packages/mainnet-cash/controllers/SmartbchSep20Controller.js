/**
 * The SmartbchSep20Controller file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic reoutes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/SmartbchSep20Service');
const smartBchSep20AllBalances = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20AllBalances);
};

const smartBchSep20Balance = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20Balance);
};

const smartBchSep20DepositAddress = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20DepositAddress);
};

const smartBchSep20DepositQr = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20DepositQr);
};

const smartBchSep20Genesis = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20Genesis);
};

const smartBchSep20Mint = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20Mint);
};

const smartBchSep20Send = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20Send);
};

const smartBchSep20SendMax = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20SendMax);
};

const smartBchSep20TokenInfo = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20TokenInfo);
};


module.exports = {
  smartBchSep20AllBalances,
  smartBchSep20Balance,
  smartBchSep20DepositAddress,
  smartBchSep20DepositQr,
  smartBchSep20Genesis,
  smartBchSep20Mint,
  smartBchSep20Send,
  smartBchSep20SendMax,
  smartBchSep20TokenInfo,
};
