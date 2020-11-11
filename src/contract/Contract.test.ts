// import { Contract }  from "./Contract"
// import { RegTestWallet } from "../../wallet/Wif"

// var contract = Contract.fromCashScript('pragma ...', [buyer.cashaddr, seller.cashaddr, ]);
// contract.getDepositAddress()
// var contractId = contract.toString();
// let contract2 = Contract.fromString(contractId);
// await contract2.call('refund', [buyer.cashaddr])

import { EscrowContract } from "./escrow/EscrowContract";
import { RegTestWallet } from "../wallet/Wif";
import { Contract } from "cashscript";

describe(`Test Escrow Contracts`, () => {
  test("Do nothing", async () => {
    expect(1).toBe(1);
  });
});
