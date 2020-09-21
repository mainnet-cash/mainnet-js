import { createWallet } from "../src/wallet/createWallet";
import { WalletTypeEnum } from "./wallet/enum";
import { walletFromIdString } from "../src/wallet/createWallet";

let args = process.argv.slice(); // remove ts-node
args.shift(); // remove ts-node
args.shift(); // remove cli.ts


(async () => {
    let command = args.shift()
    let w
    switch (command) {

        case 'wallet/create':
            let response = await createWallet({ name: args[0], type: args[1] as WalletTypeEnum, network: args[2] })
            console.log(response)
            break;
        case 'wallet/deposit_qr':
            w = await walletFromIdString(args[0])
            console.log(w.depositQr())
            break;
        case 'wallet/deposit_address':
            w = await walletFromIdString(args[0])
            console.log(w.depositAddress())
            break;
        default:
            console.log(`${command} not implemented`)
    }

})();
