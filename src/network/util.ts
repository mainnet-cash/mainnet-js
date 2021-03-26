import { ElectrumTransport, TransportScheme } from "electrum-cash";
import {
  getRuntimePlatform,
  RuntimePlatform,
} from "../util/getRuntimePlatform";
import { ElectrumHostParams } from "./interface";

export function parseElectrumUrl(givenUrl: string): ElectrumHostParams {
  console.log(givenUrl);
  let url = new URL(givenUrl);
  let port, scheme, hostname;
  if (RuntimePlatform.app === getRuntimePlatform()) {
    port = "443";
    scheme = "wss";
    hostname = "fulcrum.fountainhead.cash";
  } else {
    port = parseInt(url.port || "443");
    scheme = getElectrumScheme(url.protocol);
    hostname = url.hostname;
  }

  return { host: hostname, port: port, scheme: scheme };
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
