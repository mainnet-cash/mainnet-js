/**
 * The WalletSlpController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic reoutes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/WalletSlpService');
const slpAllBalances = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpAllBalances);
};

const slpBalance = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpBalance);
};

const slpDepositAddress = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpDepositAddress);
};

const slpDepositQr = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpDepositQr);
};

const slpGenesis = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpGenesis);
};

const slpMint = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpMint);
};

const slpSend = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpSend);
};

const slpSendMax = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpSendMax);
};

const slpTokenInfo = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpTokenInfo);
};

const slpUtxos = async (request, response) => {
  await Controller.handleRequest(request, response, service.slpUtxos);
};


module.exports = {
  slpAllBalances,
  slpBalance,
  slpDepositAddress,
  slpDepositQr,
  slpGenesis,
  slpMint,
  slpSend,
  slpSendMax,
  slpTokenInfo,
  slpUtxos,
};