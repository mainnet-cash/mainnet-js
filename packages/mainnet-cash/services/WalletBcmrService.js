/* eslint-disable no-unused-vars */
import Service from './Service.js';
import { BCMR } from '@mainnet-cash/bcmr';

/**
* Add BCMR metadata registry from autchain, returning the built chain
*
* bcmrAddMetadataRegistryAuthChainRequest BcmrAddMetadataRegistryAuthChainRequest Add BCMR metadata registry by resolving an authchain, allowing for token info lookup 
* returns List
* */
const bcmrAddMetadataRegistryAuthChain = ({ bcmrAddMetadataRegistryAuthChainRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const resp = await BCMR.addMetadataRegistryAuthChain(bcmrAddMetadataRegistryAuthChainRequest);

      resolve(Service.successResponse(resp));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Add BCMR registry from parameter
*
* requestUnderscorebody Map Add a BCMR registry to the list of tracked, allowing for token info lookup
* returns Object
* */
const bcmrAddRegistry = ({body}) => new Promise(
  async (resolve, reject) => {
    try {
      BCMR.addMetadataRegistry(body)

      resolve(Service.successResponse({}));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Reset tracked BCMR registries
*
* bcmrAddRegistryFromUriRequest BcmrAddRegistryFromUriRequest Add a BCMR registry from remote URI to the list of tracked, allowing for token info lookup 
* returns Object
* */
const bcmrAddRegistryFromUri = ({ bcmrAddRegistryFromUriRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      await BCMR.addMetadataRegistryFromUri(bcmrAddRegistryFromUriRequest.uri, bcmrAddRegistryFromUriRequest.contentHash);

      resolve(Service.successResponse({}));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Build a BCMR authchain
*
* bcmrBuildAuthChainRequest BcmrBuildAuthChainRequest Build an authchain - Zeroth-Descendant Transaction Chain, refer to https://github.com/bitjson/chip-bcmr#zeroth-descendant-transaction-chains The authchain in this implementation is specific to resolve to a valid metadata registy 
* returns List
* */
const bcmrBuildAuthChain = ({ bcmrBuildAuthChainRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const resp = await BCMR.buildAuthChain(bcmrBuildAuthChainRequest);
      resolve(Service.successResponse(resp));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get token info
*
* bcmrGetTokenInfoRequest BcmrGetTokenInfoRequest Return the token info (the identity snapshot as per BCMR spec) 
* returns Map
* */
const bcmrGetTokenInfo = ({ bcmrGetTokenInfoRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      const resp = BCMR.getTokenInfo(bcmrGetTokenInfoRequest.tokenId);

      resolve(Service.successResponse({tokenInfo: resp}));
    } catch (e) {
      console.trace(e)
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Get tracked BCMR registries
*
* body Object Get tracked BCMR registries.  (optional)
* returns List
* */
const bcmrGetRegistries = ({ body }) => new Promise(
  async (resolve, reject) => {
    try {
      const resp = BCMR.getRegistries();

      resolve(Service.successResponse(resp));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
/**
* Reset tracked BCMR registries
*
* body Object Reset tracked BCMR registries, dropping all token info.  (optional)
* returns Object
* */
const bcmrResetRegistries = ({ body }) => new Promise(
  async (resolve, reject) => {
    try {
      BCMR.resetRegistries();

      resolve(Service.successResponse({}));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

export default {
  bcmrAddMetadataRegistryAuthChain,
  bcmrAddRegistry,
  bcmrAddRegistryFromUri,
  bcmrBuildAuthChain,
  bcmrGetTokenInfo,
  bcmrGetRegistries,
  bcmrResetRegistries,
};
