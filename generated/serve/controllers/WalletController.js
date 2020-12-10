/**
 * The WalletController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic reoutes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/WalletService');
const balance = async (request, response) => {
  await Controller.handleRequest(request, response, service.balance);
};

const convert = async (request, response) => {
  await Controller.handleRequest(request, response, service.convert);
};

const createWallet = async (request, response) => {
  await Controller.handleRequest(request, response, service.createWallet);
};

const depositAddress = async (request, response) => {
  await Controller.handleRequest(request, response, service.depositAddress);
};

const depositQr = async (request, response) => {
  await Controller.handleRequest(request, response, service.depositQr);
};

const maxAmountToSend = async (request, response) => {
  await Controller.handleRequest(request, response, service.maxAmountToSend);
};

const send = async (request, response) => {
  await Controller.handleRequest(request, response, service.send);
};

const sendMax = async (request, response) => {
  await Controller.handleRequest(request, response, service.sendMax);
};

const utxos = async (request, response) => {
  await Controller.handleRequest(request, response, service.utxos);
};


module.exports = {
  balance,
  convert,
  createWallet,
  depositAddress,
  depositQr,
  maxAmountToSend,
  send,
  sendMax,
  utxos,
};
