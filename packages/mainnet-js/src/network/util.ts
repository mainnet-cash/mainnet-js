import { ElectrumHostParams } from "./interface.js";

export function parseElectrumUrl(givenUrl: string): ElectrumHostParams {
  let url = new URL(givenUrl);
  let port = parseInt(url.port || "443");
  let scheme = getElectrumScheme(url.protocol);

  return { host: url.hostname, port: port, scheme: scheme };
}

function getElectrumScheme(protocol: string) {
  let transport: string;
  switch (protocol) {
    case "http:":
      transport = "tcp";
      break;
    case "https:":
      transport = "tcp_tls";
      break;
    case "ws:":
      transport = "ws";
      break;
    case "wss:":
      transport = "wss";
      break;
    default:
      throw Error("Electrum transport protocol not understood.");
  }
  return transport as "tcp" | "tcp_tls" | "ws" | "wss";
}
