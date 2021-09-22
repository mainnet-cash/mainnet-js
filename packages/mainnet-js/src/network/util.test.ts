import { parseElectrumUrl } from "./util";

test("Should parse various electrum urls", async () => {
  expect(parseElectrumUrl("https://localhost:1")).toEqual({
    host: "localhost",
    port: 1,
    scheme: "tcp_tls",
  });
  expect(parseElectrumUrl("http://127.0.0.1:1")).toEqual({
    host: "127.0.0.1",
    port: 1,
    scheme: "tcp",
  });
  expect(parseElectrumUrl("ws://1.2.3.4:10001")).toEqual({
    host: "1.2.3.4",
    port: 10001,
    scheme: "ws",
  });
  expect(parseElectrumUrl("wss://example.space:1")).toEqual({
    host: "example.space",
    port: 1,
    scheme: "wss",
  });
});
