/* eslint-disable no-unused-vars */
import { Service } from './Service';

// @ts-ignore
import * as core from "express-serve-static-core";
/**
* Send some amount to a given address
*
* body SendRequest place a send request
* returns SendResponse
* */
export const sendRequest = ({ body }:{body:core.Request}) => new Promise(
  async (resolve, reject) => {
    try {
      
      resolve(Service.successResponse({
        body,
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);
