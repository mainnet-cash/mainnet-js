var QRCode = require("qrcode-svg");
/**
 * qrAddress returns a qr code for a given cashaddress as raw utf-8 svg
 * @param  {string} address
 * @param  {} size=256 The width and height of the returned image
 * @returns string
 */
export function qrAddress(address: string, size = 256): string {
  let svg = new QRCode({
    content: address,
    width: size,
    height: size,
  }).svg();
  let svgB64 = Buffer.from(svg, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${svgB64}`;
}
