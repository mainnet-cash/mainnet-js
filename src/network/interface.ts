import { ClusterOrder } from "electrum-cash";

export interface ElectrumHostParams {
  host: string;
  port: number;
  scheme: "tcp" | "tcp_tls" | "ws" | "wss" | undefined;
}

export interface ElectrumClusterParams {
  confidence: number;
  distribution: number;
  order: ClusterOrder;
  timeout: number;
}
