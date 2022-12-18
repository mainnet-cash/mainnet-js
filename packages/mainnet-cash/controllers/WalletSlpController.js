/**
 * The WalletSlpController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

import Controller from './Controller.js';
import service from '../services/WalletSlpService.js';
export const nftChildGenesis = async (request, response) => {
  await Controller.handleRequest(request, response, service.nftChildGenesis);
};

export const nftParentGenesis = async (request, response) => {
  await Controller.handleRequest(request, response, service.nftParentGenesis);
};

export const slpAllBalances = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpAllBalances);
};

export const slpBalance = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpBalance);
};

export const slpCreateWallet = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpCreateWallet);
};

export const slpDepositAddress = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpDepositAddress);
};

export const slpDepositQr = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpDepositQr);
};

export const slpGenesis = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpGenesis);
};

export const slpMint = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpMint);
};

export const slpOutpoints = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpOutpoints);
};

export const slpSend = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpSend);
};

export const slpSendMax = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpSendMax);
};

export const slpTokenInfo = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpTokenInfo);
};

export const slpUtxos = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpUtxos);
};
