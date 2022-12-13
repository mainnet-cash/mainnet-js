/**
 * The WalletBcmrController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

import Controller from './Controller.js';
import service from '../services/WalletBcmrService.js';
export const bcmrAddMetadataRegistryAuthChain = async (request, response) => {
  await Controller.handleRequest(request, response, service.bcmrAddMetadataRegistryAuthChain);
};

export const bcmrAddRegistry = async (request, response) => {
  await Controller.handleRequest(request, response, service.bcmrAddRegistry);
};

export const bcmrAddRegistryFromUri = async (request, response) => {
  await Controller.handleRequest(request, response, service.bcmrAddRegistryFromUri);
};

export const bcmrBuildAuthChain = async (request, response) => {
  await Controller.handleRequest(request, response, service.bcmrBuildAuthChain);
};

export const bcmrGetTokenInfo = async (request, response) => {
  await Controller.handleRequest(request, response, service.bcmrGetTokenInfo);
};

export const bcmrGetRegistries = async (request, response) => {
  await Controller.handleRequest(request, response, service.bcmrGetRegistries);
};

export const bcmrResetRegistries = async (request, response) => {
  await Controller.handleRequest(request, response, service.bcmrResetRegistries);
};
