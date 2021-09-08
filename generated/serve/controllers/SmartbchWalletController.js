/**
 * The SmartbchWalletController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/SmartbchWalletService');
const smartbchBalance = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchBalance);
};

const smartbchCreateWallet = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchCreateWallet);
};

const smartbchDepositAddress = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchDepositAddress);
};

const smartbchDepositQr = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchDepositQr);
};

const smartbchMaxAmountToSend = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchMaxAmountToSend);
};

const smartbchSend = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchSend);
};

const smartbchSendMax = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchSendMax);
};

const smartbchSignedMessageSign = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchSignedMessageSign);
};

const smartbchSignedMessageVerify = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchSignedMessageVerify);
};


module.exports = {
  smartbchBalance,
  smartbchCreateWallet,
  smartbchDepositAddress,
  smartbchDepositQr,
  smartbchMaxAmountToSend,
  smartbchSend,
  smartbchSendMax,
  smartbchSignedMessageSign,
  smartbchSignedMessageVerify,
};
