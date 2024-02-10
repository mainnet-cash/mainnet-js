"use client";

import { Wallet, BaseWallet,   } from "mainnet-js";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

//import { FixedProvider } from "@/utils/FixedProvider";
import { useScript } from "@uidotdev/usehooks";
import { IndexedDBProvider } from "@mainnet-cash/indexeddb-storage";


export type TSimpleWalletRef = {
  activate: () => Promise<TWalletDetails | undefined>;
};

export type TWalletDetails = {
  balance: string
}

type SimpleWalletProps = {
  inComing: (txid:  string) => void
}
// 
const SimpleWallet = forwardRef<TSimpleWalletRef, SimpleWalletProps>(({inComing}: SimpleWalletProps, ref) => {
  const React14Wallet = useRef<Wallet>();
  const status = useScript(
    `https://cdn.mainnet.cash/indexeddb-storage/indexeddb-storage-2.3.7.js`,
    {
      removeOnUnmount: false,
    }
  );
  useEffect(() => {
    console.log(`SimpleWallet useEffect ${status} `);
    BaseWallet.StorageProvider = IndexedDBProvider;
    

    (async () => {
      const exist = await Wallet.namedExists("React14");
      if (exist) {
        React14Wallet.current = await Wallet.named("React14");
      } else {
        React14Wallet.current = await Wallet.newRandom(`React14`);
      }
      React14Wallet.current.watchAddress(inComing)
      console.log(`React14 Address ${React14Wallet.current.cashaddr}`);
    })();
  }, [inComing, status]);

  useImperativeHandle(ref, () => ({
    async activate() {
      let result = await React14Wallet.current?.sendMax("withdrawAddress")
        console.log('withdrawAddress result', result)
      return {balance: "done"};
    },
  }));


  return (
    <>
      <p>Simple Wallet </p>
    </>
  );
});

SimpleWallet.displayName = "SimpleWallet";
export default SimpleWallet;
