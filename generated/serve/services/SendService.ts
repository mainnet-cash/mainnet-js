/* eslint-disable no-unused-vars */
import { Service } from "./Service";

// @ts-ignore
import * as core from "express-serve-static-core";

/**
* Send some amount to a given address
*
* sendRequest List place a send request
* returns SendResponse
* */
export const send = ({ sendRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        sendRequest,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || "Invalid input",
        e.status || 405,
      ));
    }
  },
);
/**
* Send all available funds to a given address
*
* sendMaxRequest SendMaxRequest Request to all available funds to a given address
* returns SendMaxResponse
* */
export const sendMax = ({ sendMaxRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        sendMaxRequest,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || "Invalid input",
        e.status || 405,
      ));
    }
  },
);
