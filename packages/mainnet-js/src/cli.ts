import { createWallet } from "../src/wallet/createWallet.js";
import { WalletTypeEnum } from "./wallet/enum.js";
import { walletFromId } from "../src/wallet/createWallet.js";

let args = process.argv.slice(); // remove ts-node
args.shift(); // remove ts-node
args.shift(); // remove cli.ts

// This is an UNSUPPORTED feature for developers
// Please upstream any additions you find useful.
// There is ZERO support for this feature

(async () => {
  let command = args.shift();
  let w;
  switch (command) {
    case "wallet/create":
      let response = await createWallet({
        name: args[0],
        type: args[1] as WalletTypeEnum,
        network: args[2],
      });
      console.log(response);
      break;
    case "wallet/deposit_qr":
      w = await walletFromId(args[0]);
      console.log(w.depositQr());
      break;
    case "wallet/deposit_address":
      w = await walletFromId(args[0]);
      console.log(w.depositAddress());
      break;
    default:
      console.log(`${command} not implemented`);
  }
})();
