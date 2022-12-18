import { base64ToBin, binToBase64, isBase64 } from "@bitauth/libauth";

export function btoa(data: string) {
  return binToBase64(new TextEncoder().encode(data));
}

export function atob(data: string) {
  if (!isBase64(data)) {
    throw new Error("Provided data is not a valid base64");
  }
  return String.fromCharCode(...base64ToBin(data));
}
