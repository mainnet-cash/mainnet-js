import { UnitEnum } from "./enum";

export * from "./contract";
export * from "./db/index";
export * from "./mine";
export { UnitEnum } from "./enum";
export * from "./network";
export * from "./wallet/Wif";
export * from "./wallet/createWallet";
export * as Mainnet from "./util/index";
export { Network } from "./interface";

import { initProviders } from "./network/Connection";

async function init() {
  await initProviders();
}
init();
