/**
 * The WalletSmartbchErc20Controller file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/WalletSmartbchErc20Service');
const smartBchErc20Balance = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchErc20Balance);
};

const smartBchErc20DepositAddress = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchErc20DepositAddress);
};

const smartBchErc20DepositQr = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchErc20DepositQr);
};

const smartBchErc20Genesis = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchErc20Genesis);
};

const smartBchErc20Mint = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchErc20Mint);
};

const smartBchErc20Send = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchErc20Send);
};

const smartBchErc20SendMax = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchErc20SendMax);
};

const smartBchErc20TokenInfo = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchErc20TokenInfo);
};


module.exports = {
  smartBchErc20Balance,
  smartBchErc20DepositAddress,
  smartBchErc20DepositQr,
  smartBchErc20Genesis,
  smartBchErc20Mint,
  smartBchErc20Send,
  smartBchErc20SendMax,
  smartBchErc20TokenInfo,
};
