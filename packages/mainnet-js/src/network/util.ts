import { ElectrumTransport, TransportScheme } from "electrum-cash";
import { ElectrumHostParams } from "./interface.js";

export function parseElectrumUrl(givenUrl: string): ElectrumHostParams {
  let url = new URL(givenUrl);
  let port = parseInt(url.port || "443");
  let scheme = getElectrumScheme(url.protocol);

  return { host: url.hostname, port: port, scheme: scheme };
}

function getElectrumScheme(protocol: string) {
  let transport: TransportScheme;
  switch (protocol) {
    case "http:":
      transport = ElectrumTransport.TCP.Scheme;
      break;
    case "https:":
      transport = ElectrumTransport.TCP_TLS.Scheme;
      break;
    case "ws:":
      transport = ElectrumTransport.WS.Scheme;
      break;
    case "wss:":
      transport = ElectrumTransport.WSS.Scheme;
      break;
    default:
      throw Error("Electrum transport protocol not understood.");
  }
  return transport as "tcp" | "tcp_tls" | "ws" | "wss" | undefined;
}
