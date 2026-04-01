/* eslint-disable no-unused-vars */
import Service from "./Service.js";
import * as mainnet from "mainnet-js";
import { base64ToBin } from "@bitauth/libauth";

/**
 * Sign a message string
 *
 * signedMessageSign CreateSignedMessageRequest Request to sign a message string using a given walletId
 * returns SignedMessageResponse
 * */
const signedMessageSign = ({ createSignedMessageRequest }) =>
  new Promise(async (resolve, reject) => {
    try {
      let wallet = await mainnet.walletFromId(
        createSignedMessageRequest.walletId,
      );
      if (!wallet) {
        throw Error("Could not derive wallet");
      }
      if (!wallet.privateKey) {
        throw Error("Signing requires a private key wallet");
      }
      let resp = mainnet.SignedMessage.sign(
        createSignedMessageRequest.message,
        wallet.privateKey,
      );
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(Service.rejectResponse(e, e.status || 500));
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
      let args = verifySignedMessageRequest;
      let wallet = await mainnet.walletFromId(args.walletId);
      if (!wallet) {
        throw Error("Could not derive wallet");
      }
      let publicKey;
      if ("publicKey" in args) {
        publicKey = base64ToBin(args.publicKey);
      }
      let resp = mainnet.SignedMessage.verify(
        args.message,
        args.signature,
        wallet.cashaddr,
        publicKey,
      );
      resolve(Service.successResponse({ ...resp }));
    } catch (e) {
      reject(Service.rejectResponse(e, e.status || 500));
    }
  });

export default {
  signedMessageSign,
  signedMessageVerify,
};
