"use client";

import { Wallet } from "mainnet-js";
import { useState, useEffect } from "react";
import Image from "next/image";
import QRCode from "qrcode-svg";

interface ImageI {
  src: string;
  title: string;
  alt: string;
}

export default function MainnetWallet() {
  const [wallet, setWallet] = useState<Wallet>();
  const [image, setImage] = useState<ImageI>();
  useEffect(() => {
    const createWallet = async () => {
      const wallet = await Wallet.newRandom();
      setWallet(wallet);
      const svg = new QRCode({
        content: wallet.getDepositAddress(),
        width: 256,
        height: 256,
      }).svg();

      const svgB64 = btoa(svg);
      setImage({
        src: `data:image/svg+xml;base64,${svgB64}`,
        title: wallet.cashaddr,
        alt: "a Bitcoin Cash address QR Code",
      });
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