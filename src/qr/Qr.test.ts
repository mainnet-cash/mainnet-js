import { qrAddress } from "./Qr";

test("Generate a qr address", async () => {
  if (process.env.ADDRESS) {
    const img = qrAddress(process.env.ADDRESS);
    expect(
      img.src.startsWith("data:image/svg+xml;base64,PD94bWwgdm")
    ).toBeTruthy();
    expect(img.title).toBe(process.env.ADDRESS);
    expect(img.alt).toBe("a Bitcoin Cash address QR Code");
  } else {
    throw Error("Cash address not set in env");
  }
});
