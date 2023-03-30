import { Network, RegTestWallet, UtxoI, toUtxoId } from "mainnet-js";
import { CashscriptTransactionI } from "./interface";
import { Contract } from "./Contract";
import {
  binToBigIntUintLE,
  hexToBin,
  AuthenticationTemplate,
  authenticationTemplateToCompilerConfiguration,
  createVirtualMachineBCHCHIPs,
  createCompiler,
} from "@bitauth/libauth";
import { getBitauthUri } from "./template";

const evaluateTemplate = (template: AuthenticationTemplate) => {
  const configuration = authenticationTemplateToCompilerConfiguration(template);
  const vm = createVirtualMachineBCHCHIPs();
  const compiler = createCompiler(configuration);

  const scenarioGeneration = compiler.generateScenario({
    debug: true,
    lockingScriptId: undefined,
    unlockingScriptId: "unlock_lock",
    scenarioId: "evaluate_function",
  });

  if (
    typeof scenarioGeneration === "string" ||
    typeof scenarioGeneration.scenario === "string"
  ) {
    throw scenarioGeneration;
  }

  const verifyResult = vm.verify(scenarioGeneration.scenario.program);
  if (typeof verifyResult === "string") {
    throw verifyResult;
  }

  return verifyResult;
};

describe(`Libauth template generation tests`, () => {
  test("Test transfer with timeout template", async () => {
    const script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
      function transfer(pubkey signingPk, sig s) {
        require(checkSig(s, signingPk));
        require(hash160(signingPk) == recipientPkh);
      }

      function timeout(pubkey signingPk, sig s) {
        require(checkSig(s, signingPk));
        require(hash160(signingPk) == senderPkh);
        require(tx.time >= timeout);
      }
    }`;

    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const charlie = await RegTestWallet.newRandom();

    const alicePkh = alice.getPublicKeyHash();
    const charliePkh = charlie.getPublicKeyHash();

    const now = 215n;

    const contract = new Contract(
      script,
      [alicePkh, charliePkh, now],
      Network.REGTEST,
      1
    );

    // fund the contract
    await alice.send([
      {
        cashaddr: contract.getDepositAddress()!,
        value: 10000,
        unit: "satoshis",
      },
    ]);

    const contractUtxos = await contract.getUtxos();
    const template = (await contract.runFunctionFromStrings({
      action: "buildTemplate",
      function: "transfer",
      arguments: [charlie.getPublicKeyCompressed(), charlie.toString()],
      to: {
        to: charlie.getDepositAddress(),
        amount: 7000n,
      },
      time: 215,
      utxoIds: contractUtxos.map(toUtxoId),
    } as CashscriptTransactionI)) as AuthenticationTemplate;

    expect(evaluateTemplate(template)).toBe(true);

    const failingTemplate = (await contract.runFunctionFromStrings({
      action: "buildTemplate",
      function: "transfer",
      arguments: [alice.getPublicKeyCompressed(), charlie.toString()],
      to: {
        to: charlie.getDepositAddress(),
        amount: 7000n,
      },
      time: 215,
      utxoIds: contractUtxos.map(toUtxoId),
    } as CashscriptTransactionI)) as AuthenticationTemplate;

    expect(() => evaluateTemplate(failingTemplate)).toThrow();
  });

  test("Test anyhedge settlement", async () => {
    const script = `pragma cashscript ^0.8.0;

    // AnyHedge contract allows Hedge and Long to enter into an agreement where Hedge reduces their exposure
    // to price volatility, measured in UNITS/BCH, and Long increases their exposure to the same volatility.
    // AnyHedge also has a safety feature where Hedge and Long can exit the contract at any time through mutual agreement.
    contract AnyHedge_v0_11(
        //        Mutual redemption
        //        Hedge and Long public keys. Required to verify the mutual redemption transaction signatures.
        pubkey    hedgeMutualRedeemPublicKey,   // 33 B
        pubkey    longMutualRedeemPublicKey,    // 33 B
        int       enableMutualRedemption,       // 1 B

        //        Arbitrary output lock scripts for Hedge and Long.
        //        AnyHedge can payout to p2pkh, p2sh or any valid output.
        //        E.g. p2pkh: pushLockScript + (opDup + opHash160 + pushHash + longPKH + opEqualVerify + opCheckSig)
        //        E.g. p2sh: pushLockScript + (opHash160 + pushHash + hedgeScriptHash + opEqual)
        //        An invalid lock script will make the contract un-redeemable so both must be validated carefully.
        bytes     hedgeLockScript,              // 26 B for p2pkh, depends on script type
        bytes     longLockScript,               // 26 B for p2pkh, depends on script type

        //        Oracle
        pubkey    oraclePublicKey,              // 33 B, verifies message from oracle

        //        Money
        //        Note: All int types below must be minimally encoded.
        int       nominalUnitsXSatsPerBch,      // 1~8 B, hedge payout in Units, scaled by 1e8(sats/BCH)
        int       payoutSats,                   // 1~8 B, total payout sats, miner fee not included
        int       lowLiquidationPrice,          // 1~4 B, clamps price data to ensure valid payouts
        int       highLiquidationPrice,         // 1~4 B, clamps price data to ensure valid payouts

        //        Time
        int       startTimestamp,               // 4 B, earliest redemption timestamp under liquidation conditions
        int       maturityTimestamp,            // 4 B, required redemption timestamp under maturity conditions
    ) {

      // Mutual redemption is a safety feature where Hedge and Long can agree to exit the contract at any time.
        // It can be useful for example in the case of a funding error.
        // Note: This controls all contract inputs, such as fees, even if Hedge and Long did not provide them.
        function mutualRedeem(
            //    Hedge and Long signatures of the mutual redemption transaction.
            sig   hedgeMutualRedeemSignature,   // 65 B
            sig   longMutualRedeemSignature     // 65 B
        ) {
            // Check that mutual redemption is enabled
            require(bool(enableMutualRedemption));

            // Verify that both Hedge and Long agree to the details of this transaction.
            require(checkSig(hedgeMutualRedeemSignature, hedgeMutualRedeemPublicKey));
            require(checkSig(longMutualRedeemSignature, longMutualRedeemPublicKey));
        }

        // Payout in Liquidation or Maturity conditions
        function payout(
            // Oracle Data
            // {
            //     bytes4 messageTimestamp;
            //     bytes4 messageSequence;
            //     bytes4 contentSequence;
            //     bytes4 contentData / price;
            // }
            bytes   settlementMessage,     // 16 B, current oracle message
            datasig settlementSignature,   // 64 B, signature of oracle message, verified with oracle's pubkey
            bytes   previousMessage,       // 16 B, previous oracle message
            datasig previousSignature,     // 64 B, signature of previous oracle message, verified with oracle's pubkey
        ) {
            // Check that only a single input is used in this transaction
            require(tx.inputs.length == 1);

            // Payout must happen through Liquidation or Maturity.
            // In both cases, we need to authenticate the current and previous oracle message.
            require(checkDataSig(previousSignature, previousMessage, oraclePublicKey));
            require(checkDataSig(settlementSignature, settlementMessage, oraclePublicKey));

            // Extract previous message's content sequence.
            int previousSequence = int(previousMessage.split(8)[1].split(4)[0]);

            // If the "content sequence" is negative it represents metadata rather than a price message
            // and cannot be used inside the contract.
            require(previousSequence > 0);

            // Extract settlement message's content sequence.
            int settlementSequence = int(settlementMessage.split(8)[1].split(4)[0]);

            // Assert that the two messages connect without gaps.
            require(settlementSequence - 1 == previousSequence);

            // Extract the previous message's timestamp.
            int previousTimestamp = int(previousMessage.split(4)[0]);

            // Assert that the previous observation happened *before* the maturity time.
            // This means that *if* the current message is on/after maturity, it is the first.
            require(previousTimestamp < maturityTimestamp);

            // Extract the settlement message's price.
            int oraclePrice = int(settlementMessage.split(12)[1]);

            // Fail if the oracle price is out of specification. Specifically:
            // 1. Fail if the price is negative.
            // 2. Fail if the price is zero.
            require(oraclePrice > 0);

            // Clamp the price within the allowed price range so that redemption will always be accurate and valid.
            int clampedPrice = max(min(oraclePrice, highLiquidationPrice), lowLiquidationPrice);

            // Validate oracle timing and price.
            //
            // This is a visualization of the oracle timing.
            // L: Earliest Liquidation timestamp
            // M: Maturity timestamp
            //             L          M
            //   <---------|----------|--------->
            // A <---------○                      (Redemption should fail)
            // B           ●----------○           (Liquidation is allowed only if oracle price is out of bounds)
            // C                      ●           (Maturity is allowed only for first price message on/after timestamp M)
            // D                      ○---------> (Redemption should fail)
            //

            // Extract the settlement message's timestamp.
            int settlementTimestamp = int(settlementMessage.split(4)[0]);

            // Fail if the oracle timestamp is before the earliest liquidation time
            require(settlementTimestamp >= startTimestamp);

            // At this point we already know that the previous message was before maturity and that the current
            // message is after the earliest liquidation time. So to be valid this message needs to be either:
            // 1. A maturation, in which case the message must be on or after maturity time.
            // 2. A liquidation, in which case the price must be out of liquidation bounds.
            bool onOrAfterMaturity = settlementTimestamp >= maturityTimestamp;
            bool priceOutOfBounds = !within(clampedPrice, lowLiquidationPrice + 1, highLiquidationPrice);
            require(onOrAfterMaturity || priceOutOfBounds);

            // We survived the oracle validation gauntlet so redeem the contract with the clamped price.

            // Calculate payout sats, including dust safety
            int DUST = 546;
            int hedgeSats = max(DUST, nominalUnitsXSatsPerBch / clampedPrice);
            int longSats = max(DUST, payoutSats - hedgeSats);

            // Check that the hedge output + long output match this transaction's outputs
            require(tx.outputs.length == 2);
            require(tx.outputs[0].value == hedgeSats);
            require(tx.outputs[0].lockingBytecode == hedgeLockScript);
            require(tx.outputs[1].value == longSats);
            require(tx.outputs[1].lockingBytecode == longLockScript);
        }
    }
    `;

    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);

    // https://blockchair.com/bitcoin-cash/transaction/34fcd5953eaece948b84f7387469e1d540e7afc70c08070fc9e26f85af59cceb
    // meep debug --tx=34fcd5953eaece948b84f7387469e1d540e7afc70c08070fc9e26f85af59cceb --idx=0 --amt=8307828026
    const contractParams = [
      "03551dd2a6e60143ec31267f910ec34ac64c2ab6c9bbdf09f7d8685f500d8eda50",
      "02d4fd0feca5ce28ff03ec5f920935dd553d121f5751006eab9987ffeec8866ef2",
      binToBigIntUintLE(hexToBin("00")),
      "76a91414096600b93c7b50c29fe25582c4906f946e74bf88ac",
      "76a91493daed4dc06f52183353774d81b726972a138b0c88ac",
      "03c22127c967bb28ec518fcc225164100df40470a1f6b457cd3a85adb051dcaa56",
      binToBigIntUintLE(hexToBin("006080908f22")),
      binToBigIntUintLE(hexToBin("a0602fef01")),
      binToBigIntUintLE(hexToBin("de11")),
      binToBigIntUintLE(hexToBin("52df00")),
      binToBigIntUintLE(hexToBin("9df16b63")),
      binToBigIntUintLE(hexToBin("257e9363")),
    ];

    const funcParams = [
      "407e9363213b0500ed37050023190000",
      "852b4c7a3e8fd2eedf9b5be3873ea3c269ef083bb417435a03f36aab49f8bcd2bbddb29d2655900cd1e920e40440d01615f35f3bcea8efd9d8a66e60be35d53e",
      "047e9363203b0500ec37050023190000",
      "3ea6400b13805727419514241f54d0bf8553d987f07cd84230c562940b9636714ff9a39e4c4f8505cc2a21e24126999d21bbbea86fc82bb3ccf9d07896670aaf",
    ];

    const contract = new Contract(script, contractParams, Network.REGTEST);

    // fund the contract
    await alice.send([
      {
        cashaddr: contract.getDepositAddress()!,
        value: 8307828026,
        unit: "satoshis",
      },
    ]);

    const contractUtxos = await contract.getUtxos();
    const template = (await contract.runFunctionFromStrings({
      action: "buildTemplate",
      function: "payout",
      arguments: funcParams,
      to: [
        {
          to: "bitcoincash:qq2qjesqhy78k5xznl39tqkyjphegmn5hum4sckvhp",
          amount: 5905205905n,
        },
        {
          to: "bitcoincash:qzfa4m2dcph4yxpn2dm5mqdhy6tj5yutpszpyhqe4s",
          amount: 2402620943n,
        },
      ],
      utxoIds: [contractUtxos[0]].map(toUtxoId),
    } as CashscriptTransactionI)) as AuthenticationTemplate;
    expect(evaluateTemplate(template)).toBe(true);
  });
});
