import { NetworkType } from "..";
import { disconnectProviders, initProviders } from "../network";
import { SlpDbProvider } from "../slp";

function enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
  return Object.keys(obj).filter((k) => Number.isNaN(+k)) as K[];
}

async function getSlpDbStatus() {
  const provider = new SlpDbProvider();
  await (provider as any).SlpDbQuery({});
  return provider.Status();
}

export async function status() {
  let statusResult = {};
  for (const value of enumKeys(NetworkType)) {
    statusResult[value] = [];
  }
  return statusResult;
}
