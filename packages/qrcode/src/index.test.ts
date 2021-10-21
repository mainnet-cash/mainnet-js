import { encode_svg } from "../bin/qrcode_bg";

test("Generate a qr address", async () => {
  if ("bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0") {
    //const qr = await QrCode.initialize()
    let img = await encode_svg(
      "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0"
    );
    expect(img.startsWith("data:image/svg+xml;base64,PD94bWwgdm")).toBeTruthy();
  } else {
    throw Error("Cash address not set in env");
  }
});
