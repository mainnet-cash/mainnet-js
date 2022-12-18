/* eslint-disable no-unused-vars */
import Service from './Service.js';
import * as mainnet from "mainnet-js";
import { base64ToBin } from '@bitauth/libauth';

/**
* Sign a message string
*
* signedMessageSign CreateSignedMessageRequest Request to sign a message string using a given walletId
* returns SignedMessageResponse
* */
const signedMessageSign = ({ createSignedMessageRequest }) =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(createSignedMessageRequest.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }
      let args = createSignedMessageRequest;
      delete args.walletId;
      let msg = args.message;
      let resp = await wallet.sign(msg);
      resolve(Service.successResponse({ ... resp }));
    } catch (e) {
      reject(
        Service.rejectResponse(e, e.status || 500)
      );
    }
  });
  /**
* Verify a signed message signature
*
* verifySignedMessageRequest VerifySignedMessageRequest Request to verify a message given a signature
* returns SignedMessageResponse
* */
const signedMessageVerify = ({ verifySignedMessageRequest }) =>
new Promise(async (resolve, reject) => {
  try {
    let args = verifySignedMessageRequest
    let resp, wallet
    wallet = await mainnet.walletFromId(args.walletId);
    if (!wallet) {
      throw Error("Could not derive wallet");
    }
    if("publicKey" in verifySignedMessageRequest){
      args.publicKey = base64ToBin(verifySignedMessageRequest.publicKey)
      resp = await mainnet.SignedMessage.verify(args.message, args.signature, wallet.cashaddr, args.publicKey)
    }else{
      resp = await wallet.verify(args.message, args.signature);
    }
    resolve(Service.successResponse({... resp}));
  } catch (e) {
    reject(
      Service.rejectResponse(e, e.status || 500)
    );
  }
});


export default {
  signedMessageSign,
  signedMessageVerify
};
