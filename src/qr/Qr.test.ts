import { qrAddress } from "./Qr";

test("Generate a qr address", async () => {
  if (process.env.ADDRESS) {
    expect(qrAddress(process.env.ADDRESS).slice(0, 51)).toBe(
      `<?xml version="1.0" standalone="yes"?>\r\n<svg xmlns=`
    );
  } else {
    throw Error("Cash address not set in env");
  }
});
