/**
 * The SmartbchWalletController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

import Controller from './Controller.js';
import service from '../services/SmartbchWalletService.js';
export const smartbchBalance = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchBalance);
};

export const smartbchCreateWallet = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchCreateWallet);
};

export const smartbchDepositAddress = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchDepositAddress);
};

export const smartbchDepositQr = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchDepositQr);
};

export const smartbchMaxAmountToSend = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchMaxAmountToSend);
};

export const smartbchSend = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchSend);
};

export const smartbchSendMax = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchSendMax);
};

export const smartbchSignedMessageSign = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchSignedMessageSign);
};

export const smartbchSignedMessageVerify = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartbchSignedMessageVerify);
};

