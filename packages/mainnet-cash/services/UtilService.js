/* eslint-disable no-unused-vars */
import Service from './Service.js';
import * as mainnet from "mainnet-js";

/**
* convert value base units
*
* convertRequest ConvertRequest  (optional)
* returns BigDecimal
* */
const convert = ({ convertRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let resp = await mainnet.Mainnet.convertObject(convertRequest)
      resolve(Service.successResponse({ value: resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);

const exchangeRate = ({ exchangeRateRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      let resp = await mainnet.ExchangeRate.get(exchangeRateRequest.symbol)
      resolve(Service.successResponse({ value: resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);

const getAddrsByXpubKey = ({getAddrsByXpubKeyRequest})=> new Promise(
  async (resolve, reject) => {
    try {
      let resp = await mainnet.Mainnet.getAddrsByXpubKeyObject(getAddrsByXpubKeyRequest)
      resolve(Service.successResponse(resp));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);

const getXpubKeyInfo = ({getXpubKeyInfoRequest})=> new Promise(
  async (resolve, reject) => {
    try {
      let resp = await mainnet.Mainnet.getXpubKeyInfoObject(getXpubKeyInfoRequest)
      resolve(Service.successResponse(resp));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  },
);


export default {
  convert,
  exchangeRate,
  getAddrsByXpubKey,
  getXpubKeyInfo
};
