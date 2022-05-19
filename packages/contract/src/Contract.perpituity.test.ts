import { utf8ToBin, binToHex } from "@bitauth/libauth";
import { RegTestWallet, Network, mine, getNetworkProvider } from "mainnet-js";
import { Contract } from "./Contract";


let script = `pragma cashscript >= 0.7.0;

    // This is an experimental perpetuity contract 
    // Completely untested, just a concept
    contract Perpetuity(
        bytes20 recipientPkh,
        int initialBlock,
        int period,
        int executorAllowance,
        int decay
    ) {
        function execute() {
    
            // Check that the second output sends to the recipient
            bytes25 recipientLockingBytecode = new LockingBytecodeP2PKH(recipientPkh);
            require(tx.outputs[0].lockingBytecode == recipientLockingBytecode);
    
            // Check that time has passed and that time locks are enabled
            require(tx.time >= initialBlock);
            require(tx.age >= period);
    
            // Cut out old initialBlock (OP_PUSHBYTES_4 <initialBlock>)
            // Insert new initialBlock (OP_PUSHBYTES_4 <tx.locktime>)
            // Note that constructor parameters are added in reverse order,
            // so initialBlock is the first statement in the contract bytecode.
            
            int spliceLen = 7+bytes(tx.locktime).length;
            bytes newContract = this.activeBytecode.split(7)[0] + bytes(tx.locktime) + this.activeBytecode.split(spliceLen)[1];

            // Create the locking bytecode for the new contract and check that
            // the change output sends to that contract
            bytes23 newContractLock = new LockingBytecodeP2SH(hash160(newContract));
            require(tx.outputs[1].lockingBytecode == newContractLock);


            // Calculate the leftover amount
            int currentValue = tx.inputs[this.activeInputIndex].value;
            int installment = currentValue/decay;
            int changeValue = currentValue - installment - executorAllowance;
    
            // Check that the outputs send the correct amounts
            require(tx.outputs[0].value >= installment);
            require(tx.outputs[1].value >= changeValue);
                
        }
    
    }`;


describe(`Example Perpituity Tests`, () => {
  test("Should pay a perpituity contract", async () => {

    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.fromSeed(
      "rubber amateur across squirrel deposit above dish toddler visa cherry clerk egg"
    );
    const charlie = await RegTestWallet.newRandom()

    const bobPkh = bob.getPublicKeyHash();
    let regtestProvider = getNetworkProvider("regtest")
    let now = await regtestProvider.getBlockHeight()
    let fee = 5000
    let decay = 120
    let step = 10
    let contract = new Contract(
      script,
      [bobPkh, now, step, fee, decay],
      Network.REGTEST,
      1
    );

    // fund the perp contract
    await alice.send([
      {
        cashaddr: contract.getDepositAddress()!,
        value: 680000000,
        unit: "satoshis",
      },
    ]);

    let contracts = [contract]

    
    for(let x=0; x<11; x++){

      await mine({"cashaddr":"bchreg:ppt0dzpt8xmt9h2apv9r60cydmy9k0jkfg4atpnp2f", "blocks":step})
      
      let balance = await contracts.slice(-1)[0]!.getBalance();
      let installment = Math.round(balance/120)
      let fn = contracts.slice(-1)[0]!.getContractFunction("execute")()
      
      
      now += step
      let nextContract = new Contract(
        script,
        [bobPkh, now, step, fee, decay],
        Network.REGTEST,
        1
      );   

      let txn = await fn.to(
        [
          {"to":bob.getDepositAddress(), "amount":installment+3},
          {"to":nextContract.getDepositAddress(), "amount":balance-(installment+fee)+3},
          {"to":charlie.getDepositAddress(), "amount":700+x},
        ]
        ).withTime(now).withAge(10).withoutChange().send();

      contracts.push(nextContract)

    }

    expect(await bob.getBalance("sat")).toBeGreaterThan(50000000)  

  });

});
