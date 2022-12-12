/**
 * The WalletController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

import Controller from './Controller.js';
import service from '../services/WalletService.js';
export const balance = async (request, response) => {
  await Controller.handleRequest(request, response, service.balance);
};

export const createWallet = async (request, response) => {
  await Controller.handleRequest(request, response, service.createWallet);
};

export const depositAddress = async (request, response) => {
  await Controller.handleRequest(request, response, service.depositAddress);
};

export const depositQr = async (request, response) => {
  await Controller.handleRequest(request, response, service.depositQr);
};

export const encodeTransaction = async (request, response) => {
  await Controller.handleRequest(request, response, service.encodeTransaction);
};

export const getHistory = async (request, response) => {
  await Controller.handleRequest(request, response, service.getHistory);
};

export const info = async (request, response) => {
  await Controller.handleRequest(request, response, service.info);
};

export const maxAmountToSend = async (request, response) => {
  await Controller.handleRequest(request, response, service.maxAmountToSend);
};

export const namedExists = async (request, response) => {
  await Controller.handleRequest(request, response, service.namedExists);
};

export const replaceNamed = async (request, response) => {
  await Controller.handleRequest(request, response, service.replaceNamed);
};

export const send = async (request, response) => {
  await Controller.handleRequest(request, response, service.send);
};

export const sendMax = async (request, response) => {
  await Controller.handleRequest(request, response, service.sendMax);
};

export const submitTransaction = async (request, response) => {
  await Controller.handleRequest(request, response, service.submitTransaction);
};

export const utxos = async (request, response) => {
  await Controller.handleRequest(request, response, service.utxos);
};

export const xpubkeys = async (request, response) => {
  await Controller.handleRequest(request, response, service.xpubkeys);
};

export const tokenBurn = async (request, response) => {
  await Controller.handleRequest(request, response, service.tokenBurn);
};

export const tokenGenesis = async (request, response) => {
  await Controller.handleRequest(request, response, service.tokenGenesis);
};

export const tokenMint = async (request, response) => {
  await Controller.handleRequest(request, response, service.tokenMint);
};

export const getNftTokenBalance = async (request, response) => {
  await Controller.handleRequest(request, response, service.getNftTokenBalance);
};

export const getTokenBalance = async (request, response) => {
  await Controller.handleRequest(request, response, service.getTokenBalance);
};

export const getTokenUtxos = async (request, response) => {
  await Controller.handleRequest(request, response, service.getTokenUtxos);
};

export const getAllNftTokenBalances = async (request, response) => {
  await Controller.handleRequest(request, response, service.getAllNftTokenBalances);
};

export const getAllTokenBalances = async (request, response) => {
  await Controller.handleRequest(request, response, service.getAllTokenBalances);
};
