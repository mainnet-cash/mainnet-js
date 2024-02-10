"use client";

import { FC, lazy, useEffect, useRef, useState } from "react";
import { TSimpleWalletRef } from "../components/SimpleWallet";

/**
 * Important to lazy load the mainnet-js 
 */
const SimpleWallet = lazy(() => import("../components/SimpleWallet"));

const Home = () => {
  const simpleWalletRef = useRef<TSimpleWalletRef>(null);
  const [transactionIn, setTransactionIn] = useState("")

  useEffect(() => {
    console.log(`refresh ${transactionIn}  `);
  }, [transactionIn]);

 const inComing = (tx: string) => {
   console.log(`Deal with incoming transactions here  `);
   console.log(`We received a transaction with an id of ${tx}`)
   setTransactionIn(tx)
 }
  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Mainnet-js React Next  14+</h1>
      <p>Your Application goes here</p>
      <label>Communicate with your wallet Actions</label>
      {/*  Any suitable wallet action can be trigger from our main page.
           spending, contract calls etc...
        */}
      <button className="bg-slate-600" onClick={() => {simpleWalletRef.current?.activate()} }>Wallet Actions</button>

      {/* Load the wallet with 
          1) A forward ref so we can initiate actions on it.
          2) And a call back function so that we can be informed of wallet actions */}
      <SimpleWallet ref={simpleWalletRef} inComing={inComing}></SimpleWallet>
     
    </div>
  );
}

export default Home
