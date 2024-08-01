"use client";

import { ImageI, Wallet } from "mainnet-js";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function MainnetWallet() {
  const [wallet, setWallet] = useState<Wallet>();
  const [image, setImage] = useState<ImageI>();
  useEffect(() => {
    const createWallet = async () => {
      const wallet = await Wallet.newRandom();
      setWallet(wallet);
      setImage(wallet.getDepositQr());
    }

    createWallet();
  }, [])
  return (
    <>
      <div className="">
        {image && <Image
          src={image.src}
          alt={image.alt}
          title={image.title}
          className=""
          width={256}
          height={256}
          priority
        />}
      </div>
      {wallet && <div className="">
        <div className="">
          <p>
            Wallet address: &nbsp;
            <code>{wallet?.cashaddr}</code>
          </p>
        </div>
      </div>}
    </>
  );
}