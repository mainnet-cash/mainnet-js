/**
 * The SmartbchSep20Controller file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

import Controller from './Controller.js';
import service from '../services/SmartbchSep20Service.js';
export const smartBchSep20AllBalances = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20AllBalances);
};

export const smartBchSep20Balance = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20Balance);
};

export const smartBchSep20DepositAddress = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20DepositAddress);
};

export const smartBchSep20DepositQr = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20DepositQr);
};

export const smartBchSep20Genesis = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20Genesis);
};

export const smartBchSep20Mint = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20Mint);
};

export const smartBchSep20Send = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20Send);
};

export const smartBchSep20SendMax = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20SendMax);
};

export const smartBchSep20TokenInfo = async (request, response) => {
  await Controller.handleRequest(request, response, service.smartBchSep20TokenInfo);
};
