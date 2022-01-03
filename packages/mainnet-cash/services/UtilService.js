/* eslint-disable no-unused-vars */
const Service = require('./Service');
const mainnet = require("mainnet-js");

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
      resolve(Service.successResponse(resp.toString()));
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


module.exports = {
  convert,
  getAddrsByXpubKey,
  getXpubKeyInfo
};
