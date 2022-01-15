/**
 * The WalletController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/WalletService');
const balance = async (request, response) => {
  await Controller.handleRequest(request, response, service.balance);
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

const encodeTransaction = async (request, response) => {
  await Controller.handleRequest(request, response, service.encodeTransaction);
};

const info = async (request, response) => {
  await Controller.handleRequest(request, response, service.info);
};

const maxAmountToSend = async (request, response) => {
  await Controller.handleRequest(request, response, service.maxAmountToSend);
};

const namedExists = async (request, response) => {
  await Controller.handleRequest(request, response, service.namedExists);
};

const replaceNamed = async (request, response) => {
  await Controller.handleRequest(request, response, service.replaceNamed);
};

const send = async (request, response) => {
  await Controller.handleRequest(request, response, service.send);
};

const sendMax = async (request, response) => {
  await Controller.handleRequest(request, response, service.sendMax);
};

const submitTransaction = async (request, response) => {
  await Controller.handleRequest(request, response, service.submitTransaction);
};

const utxos = async (request, response) => {
  await Controller.handleRequest(request, response, service.utxos);
};

const xpubkeys = async (request, response) => {
  await Controller.handleRequest(request, response, service.xpubkeys);
};


module.exports = {
  balance,
  createWallet,
  depositAddress,
  depositQr,
  encodeTransaction,
  info,
  maxAmountToSend,
  namedExists,
  replaceNamed,
  send,
  sendMax,
  submitTransaction,
  utxos,
  xpubkeys,
};
