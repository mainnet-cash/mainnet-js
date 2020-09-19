var QRCode = require("qrcode-svg");

export interface Image {
  src: string;
  title: string;
  alt: string;
}
/**
 * qrAddress returns a qr code for a given cashaddress as raw utf-8 svg
 * @param  {string} address
 * @param  {} size=256 The width and height of the returned image
 * @returns Image
 */
export function qrAddress(address: string, size = 256): Image {
  let svg = new QRCode({
    content: address,
    width: size,
    height: size,
  }).svg();
  let svgB64 = "";
  if (typeof process === "undefined") {
    svgB64 = btoa(svg);
  } else {
    const btoa = (str: string) => {
      return Buffer.from(str).toString("base64");
    };
    svgB64 = btoa(svg);
  }

  return {
    src: `data:image/svg+xml;base64,${svgB64}`,
    title: address,
    alt: "a Bitcoin Cash address QR Code",
  };
}
