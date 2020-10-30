import { EscrowContract } from "./EscrowContract"
import { RegTestWallet } from "../../wallet/Wif"
import { Contract } from "cashscript";

describe(`Test Escrow Contracts`, () => {

    test("Should create a contract", async () => {


        let arbiter = await RegTestWallet.newRandom() as RegTestWallet
        let buyer = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF) as RegTestWallet
        let seller = await RegTestWallet.newRandom() as RegTestWallet
        let escrow = new EscrowContract(
            {
                arbiterCashaddr: arbiter.getDepositAddress()!,
                buyerCashaddr: buyer.getDepositAddress()!,
                sellerCashaddr: seller.getDepositAddress()!
            }
        )
        let fundingResponse = await buyer.send([{
            cashaddr: escrow.getAddress(),
            value: 5000,
            unit: "satoshis",
          }])
        
        let spendResponse = await escrow.run(arbiter.privateKeyWif!, "spend", true, fundingResponse.txId)
        console.log(JSON.stringify(spendResponse))
        //await escrow.run(process.env.PRIVATE_WIF!, "spend", true, fundingResponse.txId)
        expect(seller.getBalance('sat')).toBeGreaterThan(20);
    });


})