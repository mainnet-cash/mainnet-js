import { qrAddress } from "./Qr";

test("Generate a qr address", async () => {
  if (process.env.ADDRESS) {
    const src = qrAddress(process.env.ADDRESS);
    expect(src.startsWith("data:image/svg+xml;base64,PD94bWwgdm")).toBeTruthy();
  } else {
    throw Error("Cash address not set in env");
  }
});
