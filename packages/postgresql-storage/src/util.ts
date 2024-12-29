import { base64ToBin, binToUtf8 } from "@bitauth/libauth";

export interface sslConfigI {
  rejectUnauthorized: boolean;
  ca?: string;
  key?: string;
  cert?: string;
}

export function getSslConfig(): sslConfigI | undefined {
  const ca = process.env.DATABASE_SSL_CA
    ? binToUtf8(base64ToBin(process.env.DATABASE_SSL_CA))
    : undefined;
  const key = process.env.DATABASE_SSL_KEY
    ? binToUtf8(base64ToBin(process.env.DATABASE_SSL_KEY))
    : undefined;
  const cert = process.env.DATABASE_SSL_CERT
    ? binToUtf8(base64ToBin(process.env.DATABASE_SSL_CERT))
    : undefined;
  let ssl: sslConfigI = {
    rejectUnauthorized:
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED == "false" ? false : true,
    ca: ca,
    key: key,
    cert: cert,
  };
  if (ssl.ca || ssl.cert || ssl.key) {
    return ssl;
  } else {
    return;
  }
}
