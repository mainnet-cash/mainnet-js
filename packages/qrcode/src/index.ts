import init from "../bin/qrcode";
import { encode_svg } from "../bin/qrcode_bg";

let initialized = false;
export class QrCode {
  private constructor() {}

  /* snip member functions that use wasm functions */

  public static initialize = async () => {
    if (!initialized) {
      // @ts-ignore
      await init(qrcodeBase64Bytes());
      initialized = true;
    }

    return new QrCode();
  };

  public encode_svg(str: String){
    return encode_svg(str)
  }
}