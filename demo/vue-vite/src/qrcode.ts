import QRCode from "qrcode-svg";

/**
 * qrAddress returns a qr code for a given cashaddress as raw utf-8 svg
 * @param  {string} address
 * @param  {} size=256 The width and height of the returned image
 * @returns Image
 */
export function qrAddress(address: string, size = 256) {
  const svg = new QRCode({
    content: address,
    width: size,
    height: size,
  }).svg();

  const svgB64 = btoa(svg);
  return {
    src: `data:image/svg+xml;base64,${svgB64}`,
    title: address,
    alt: "a Bitcoin Cash address QR Code",
  };
}