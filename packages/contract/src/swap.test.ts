import {
  Network,
  NFTCapability,
  toTokenaddr,
  Wallet,
  hexToBin,
  OpReturnData,
  BCMR,
  getRandomInt,
  TokenSendRequest,
  SendRequest,
  TestNetWallet,
  RegTestWallet,
} from "mainnet-js";

import { Contract } from "./Contract";
import { getSignatureTemplate } from "./util";

import {
  sha256,
  hash160,
  utf8ToBin,
  numberToBinUint32LE,
  binToHex,
  bigIntToVmNumber,
  encodeDataPush,
  encodeAuthenticationInstructions,
} from "@bitauth/libauth";
import { toCashScript } from "./WrappedProvider";
import { getBitauthUri, buildTemplate } from "./template";
import { Transaction, Utxo } from "cashscript";
import {
  asmToBytecode,
  replaceBytecodeNop,
  scriptToBytecode,
} from "@cashscript/utils";
import { encodeArgument } from "cashscript/dist/Argument";

const isTestnet = false;
const WalletClass = isTestnet ? TestNetWallet : RegTestWallet;

const capabilityMap = {
  [NFTCapability.none]: "",
  [NFTCapability.mutable]: "01",
  [NFTCapability.minting]: "02",
};

const getContractParts = (contract: Contract) => {
  const encoded = contract.parameters
    .map((arg, i) =>
      encodeArgument(arg, contract.artifact.constructorInputs[i].type)
    )
    .reverse() as Uint8Array[];
  const head = scriptToBytecode(replaceBytecodeNop([...encoded]));

  const tail = asmToBytecode(contract.artifact.bytecode);
  const tailHash = sha256.hash(tail);

  return {
    head,
    tailHash,
  };
};

const createContract = ({
  ownerPubKeyHash,
  wantSats,
  wantCategory,
  wantNFTCommitment,
  wantFTs,
  platformPubKeyHash,
  platformFee,
  nonce,
  network = Network.REGTEST,
}: {
  ownerPubKeyHash: Uint8Array;
  wantSats: bigint;
  wantCategory: string;
  wantNFTCommitment: string;
  wantFTs: bigint;
  platformPubKeyHash: Uint8Array;
  platformFee: bigint;
  nonce?: any;
  network?: Network;
}) => {
  const script = /* c */ `// Simple Swap for Bitcoin Cash (BCH) CashTokens
// v2.0.0

// The contract address will encode the maker's blind offer.
// The maker sets his cancel/payout key and a list of wants, then
// generates the contract P2SH address and funds it with his offering.
// Taker may spend from the contract to take the offering only if he
// creates an output that satisfies the wants and funds the TX with
// inputs that will balance the TX.
// The output which satisfies the wants MUST be placed on the same
// output index as this contract's input's index.

// The contract may be used to swap any 2 UTXOs but it is most suitable
// for swapping NFTs since the offer may either be taken in whole or not
// at all, it does not support partial fills when used to swap fungible
// tokens (FTs).

// It is strongly advised that apps record the contract parameters in an
// OP_RETURN when they create the offer, so redeem script may be
// reconstructed and can't be accidentally lost, which would result in
// loss of funds.
// Suggestion:
// - OP_RETURN <'SWAP'> <0> <5> <wantSats> <wantCategoryID>
// <wantNFTCommitment> <wantFTs> <ownerPubKeyHash>
// Where <0> is intended as the version of a swap contract, and <5> as
// the number of arguments.

// It is app's responsibility to produce a correct output that
// "captures" the offering for the taker.
// Failure to include the taker's outputs will burn the offering he just
// purchased.

// Similarly, it is app's responsibility to produce a correct output
// that takes back the offering when cancelling offers.

pragma cashscript ^0.8.0;


contract SimpleNFTSwap(
  int wantSats,
  bytes wantCategory,
  bytes wantNFTCommitment,
  int wantFTs,
  bytes ownerPubKeyHash,
  bytes platformPubKeyHash,
  int platformFee,
) {
  function TradeOrCancel(
    bytes cancelSignature, bytes ownerPubKey
  ) {
    // require(nonce == nonce);
    // If 0 then it's a trade
    if (
      cancelSignature == 0x
    ) {
      // If transaction has a payout to owner's P2PKH transaction that
      // satisfies the wants then allow the swap without needing owner's
      // signature.
      // The payout MUST be at an output index matching this input's
      // index!
      // If we allowed any output index, then failing to cancel multiple
      // offers would expose the maker to having multiple offers
      // satisfied with the same output.

      // Verify BCH amount
      require(
        tx.outputs[this.activeInputIndex].value
        >= wantSats
      );

      // Verify token category (note: this includes the NFT capability)
      require(
        tx.outputs[this.activeInputIndex].tokenCategory
        == wantCategory
      );

      // Verify NFT commitment
      require(
        tx.outputs[this.activeInputIndex].nftCommitment
        == wantNFTCommitment
      );

      // Verify FT amount
      require(
        tx.outputs[this.activeInputIndex].tokenAmount
        >= wantFTs
      );

      // Generate owner's P2PKH locking bytecode
      bytes ownerP2PKH = 0x76a914 + ownerPubKeyHash + 0x88ac;

      // Require satisfactory output be paid out to owner's P2PKH
      // address
      require(
        tx.outputs[this.activeInputIndex].lockingBytecode
        == ownerP2PKH
      );

      // Generate platform's P2PKH locking bytecode
      bytes platformP2PKH = 0x76a914 + platformPubKeyHash + 0x88ac;
      // Require satisfactory output be paid out to platforms's P2PKH address
      require(tx.outputs[2].lockingBytecode == platformP2PKH);
      // Enforce platform fee
      require(tx.outputs[2].value == platformFee);
    }
    // Else owner or platform must sign for this input, which will cancel the offer.
    // Owner is responsible for creating an output that takes his offering back.
    // Failing to do so will result in loss of funds.
    // Platform is allowed to cancel the offer
    else {
      // Check owner's or platform's signature
      require(checkSig(sig(cancelSignature), pubkey(ownerPubKey)));
      //  || checkSig(cancelSignature, platformPubKeyHash));

      // implement refund checks
    }
  }
}
`;

  // first 4 bytes
  nonce = getRandomInt(1e18);

  return new Contract(
    script,
    [
      wantSats,
      wantCategory,
      wantNFTCommitment,
      wantFTs,
      ownerPubKeyHash,
      platformPubKeyHash,
      platformFee,
    ],
    network
  );
};

describe(`Create Contract Tests`, () => {
  test("swap NFT for bch", async () => {
    const funder = isTestnet
      ? await WalletClass.fromSeed(
          "excuse mother slide subject desert ability dad slab observe mandate tiger code",
          "m/44'/145'/0'/0/0"
        )
      : await WalletClass.fromId(process.env.ALICE_ID!);

    const alice = await WalletClass.newRandom();
    const bob = await WalletClass.newRandom();
    const platform = await WalletClass.newRandom();

    await funder.send([
      {
        cashaddr: alice.getDepositAddress(),
        value: 0.01,
        unit: "bch",
      },
      {
        cashaddr: bob.getDepositAddress(),
        value: 0.01,
        unit: "bch",
      },
    ]);

    const genesisInput = (await alice.getAddressUtxos()).filter(
      (val) => !val.token && val.vout === 0
    )[0];
    const genesisResponse = await alice.tokenGenesis(
      {
        cashaddr: alice.getDepositAddress(),
        capability: NFTCapability.none,
        commitment: `0100`,
      },
      undefined,
      { utxoIds: [genesisInput] }
    );

    const ownerPubKeyHash = hash160(
      alice.getPublicKeyCompressed() as Uint8Array
    );
    const wantSats = 10000n;
    const wantCategory = "";
    const wantNFTCommitment = "";
    const wantFTs = 0n;
    const platformPubKeyHash = hash160(
      platform.getPublicKeyCompressed() as Uint8Array
    );
    const platformFee = 1000n;

    const contract = createContract({
      wantSats,
      wantCategory,
      wantNFTCommitment,
      wantFTs,
      ownerPubKeyHash,
      platformPubKeyHash,
      platformFee,
      network: isTestnet ? Network.TESTNET : Network.REGTEST,
    });

    const tailHash = sha256
      .hash(asmToBytecode(contract.artifact.bytecode))
      .slice(0, 4);
    const version = 0n;

    const response = await alice.send([
      new TokenSendRequest({
        cashaddr: contract.getDepositAddress(),
        tokenId: genesisResponse.tokenIds![0],
        capability: NFTCapability.none,
        commitment: `0100`,
      }),
      OpReturnData.fromArray([
        "MPSW",
        bigIntToVmNumber(version),
        tailHash,
        platformPubKeyHash,
        bigIntToVmNumber(wantSats),
        hexToBin(wantCategory),
        hexToBin(wantNFTCommitment),
        bigIntToVmNumber(wantFTs),
        ownerPubKeyHash,
        bigIntToVmNumber(platformFee),
      ]),
    ]);
    // console.log(await alice.provider.getRawTransaction(response.txId));

    const func = contract.getContractFunction("TradeOrCancel");
    const sig = getSignatureTemplate(bob);

    let contractUtxos = (await contract.getUtxos()).map(toCashScript);
    let contractInput = contractUtxos[0];

    let bobUtxos = (await bob.getAddressUtxos()).map(toCashScript);
    let bobInput = bobUtxos[0];
    let promise: Transaction;

    // fail to mint, covent does not receive mintCost
    promise = func("", "")
      .from(contractInput)
      .fromP2PKH(bobInput, sig)
      .to([
        {
          to: alice.getDepositAddress(),
          amount: wantSats,
        },
        // bobs new NFT
        {
          to: toTokenaddr(bob.getTokenDepositAddress()),
          amount: 1000n,
          token: {
            category: genesisResponse.tokenIds![0],
            amount: 0n,
            nft: {
              capability: "none",
              commitment: `0100`,
            },
          },
        },
        // platform fee
        {
          to: platform.getDepositAddress(),
          amount: BigInt(platformFee),
        },
      ]);

    await promise.build();

    // bob's bch change
    (promise as any).outputs.at(-1).to = bob.getDepositAddress();
    (promise as any).outputs.at(-1).amount -= 2n;

    await promise.send();

    expect((await alice.getTokenUtxos()).length).toBe(0);
    expect((await bob.getTokenUtxos()).length).toBe(1);
    expect(await platform.getBalance("sat")).toBe(Number(platformFee));
  });

  test("swap bch for NFT", async () => {
    const funder = isTestnet
      ? await WalletClass.fromSeed(
          "excuse mother slide subject desert ability dad slab observe mandate tiger code",
          "m/44'/145'/0'/0/0"
        )
      : await WalletClass.fromId(process.env.ALICE_ID!);

    const alice = await WalletClass.newRandom();
    const bob = await WalletClass.newRandom();
    const platform = await WalletClass.newRandom();

    await funder.send([
      {
        cashaddr: alice.getDepositAddress(),
        value: 0.01,
        unit: "bch",
      },
      {
        cashaddr: bob.getDepositAddress(),
        value: 0.01,
        unit: "bch",
      },
    ]);
    await bob.sendMax(bob.cashaddr!);

    const genesisInput = (await bob.getAddressUtxos()).filter(
      (val) => !val.token && val.vout === 0
    )[0];
    const genesisResponse = await bob.tokenGenesis(
      {
        cashaddr: bob.getDepositAddress(),
        capability: NFTCapability.none,
        commitment: `0100`,
      },
      undefined,
      { utxoIds: [genesisInput] }
    );
    const ownerPubKeyHash = hash160(
      alice.getPublicKeyCompressed() as Uint8Array
    );
    const wantSats = 1000n;
    const wantCategory =
      binToHex(hexToBin(genesisResponse.tokenIds![0]).reverse()) +
      capabilityMap[NFTCapability.none];
    const wantNFTCommitment = "0100";
    const wantFTs = 0n;
    const platformPubKeyHash = hash160(
      platform.getPublicKeyCompressed() as Uint8Array
    );
    const platformFee = 1000n;

    const contract = createContract({
      wantSats,
      wantCategory,
      wantNFTCommitment,
      wantFTs,
      ownerPubKeyHash,
      platformPubKeyHash,
      platformFee,
      network: isTestnet ? Network.TESTNET : Network.REGTEST,
    });

    const tailHash = sha256
      .hash(asmToBytecode(contract.artifact.bytecode))
      .slice(0, 4);
    const version = 0n;

    const response = await alice.send([
      new SendRequest({
        cashaddr: contract.getDepositAddress(),
        value: 10000,
        unit: "sat",
      }),
      OpReturnData.fromArray([
        "MPSW",
        bigIntToVmNumber(version),
        tailHash,
        platformPubKeyHash,
        bigIntToVmNumber(wantSats),
        hexToBin(wantCategory),
        hexToBin(wantNFTCommitment),
        bigIntToVmNumber(wantFTs),
        ownerPubKeyHash,
        bigIntToVmNumber(platformFee),
      ]),
    ]);

    const func = contract.getContractFunction("TradeOrCancel");
    const sig = getSignatureTemplate(bob);

    let contractUtxos = (await contract.getUtxos()).map(toCashScript);
    let contractInput = contractUtxos[0];

    let bobUtxos = (await bob.getTokenUtxos())
      .map(toCashScript)
      .filter((val) => val.token?.category === genesisResponse.tokenIds![0]);
    let bobInput: Utxo = bobUtxos[0];
    let promise: Transaction;

    // fail to mint, covent does not receive mintCost
    promise = func("", "")
      .from(contractInput)
      .fromP2PKH(bobInput, sig)
      .to([
        {
          to: alice.getTokenDepositAddress(),
          amount: 1000n,
          token: {
            category: genesisResponse.tokenIds![0],
            amount: 0n,
            nft: {
              capability: "none",
              commitment: `0100`,
            },
          },
        },
        // bobs bch
        {
          to: toTokenaddr(bob.getTokenDepositAddress()),
          amount: 546n, // precalculated fee
        },
        // platform fee
        {
          to: platform.getDepositAddress(),
          amount: platformFee,
        },
      ])
      .withoutChange();

    const proposal = await promise.build();

    (promise as any).outputs[1].to = bob.getDepositAddress();
    (promise as any).outputs[1].amount =
      contractInput.satoshis +
      bobInput.satoshis -
      1000n -
      BigInt(Math.ceil(proposal.length / 2)) -
      platformFee;
    await promise.send();
    expect(await platform.getBalance("sat")).toBe(Number(platformFee));
  });

  test("swap fungible for bch", async () => {
    const funder = isTestnet
      ? await WalletClass.fromSeed(
          "excuse mother slide subject desert ability dad slab observe mandate tiger code",
          "m/44'/145'/0'/0/0"
        )
      : await WalletClass.fromId(process.env.ALICE_ID!);

    const alice = await WalletClass.newRandom();
    const bob = await WalletClass.newRandom();
    const platform = await WalletClass.newRandom();

    await funder.send([
      {
        cashaddr: alice.getDepositAddress(),
        value: 0.01,
        unit: "bch",
      },
      {
        cashaddr: bob.getDepositAddress(),
        value: 0.01,
        unit: "bch",
      },
    ]);

    const genesisInput = (await alice.getAddressUtxos()).filter(
      (val) => !val.token && val.vout === 0
    )[0];
    const genesisResponse = await alice.tokenGenesis(
      {
        cashaddr: alice.getDepositAddress(),
        amount: 500,
      },
      undefined,
      { utxoIds: [genesisInput] }
    );

    const ownerPubKeyHash = hash160(
      alice.getPublicKeyCompressed() as Uint8Array
    );
    const wantSats = 10000n;
    const wantCategory = "";
    const wantNFTCommitment = "";
    const wantFTs = 0n;
    const platformPubKeyHash = hash160(
      platform.getPublicKeyCompressed() as Uint8Array
    );
    const platformFee = 1000n;

    const contract = createContract({
      wantSats,
      wantCategory,
      wantNFTCommitment,
      wantFTs,
      ownerPubKeyHash,
      platformPubKeyHash,
      platformFee,
      network: isTestnet ? Network.TESTNET : Network.REGTEST,
    });

    const tailHash = sha256
      .hash(asmToBytecode(contract.artifact.bytecode))
      .slice(0, 4);
    const version = 0n;

    const response = await alice.send([
      new TokenSendRequest({
        cashaddr: contract.getDepositAddress(),
        tokenId: genesisResponse.tokenIds![0],
        amount: 500,
      }),
      OpReturnData.fromArray([
        "MPSW",
        bigIntToVmNumber(version),
        tailHash,
        platformPubKeyHash,
        bigIntToVmNumber(wantSats),
        hexToBin(wantCategory),
        hexToBin(wantNFTCommitment),
        bigIntToVmNumber(wantFTs),
        ownerPubKeyHash,
        bigIntToVmNumber(platformFee),
      ]),
    ]);
    // console.log(await alice.provider.getRawTransaction(response.txId));

    const func = contract.getContractFunction("TradeOrCancel");
    const sig = getSignatureTemplate(bob);

    let contractUtxos = (await contract.getUtxos()).map(toCashScript);
    let contractInput = contractUtxos[0];

    let bobUtxos = (await bob.getAddressUtxos()).map(toCashScript);
    let bobInput = bobUtxos[0];
    let promise: Transaction;

    console.log(contractInput);
    // fail to mint, covent does not receive mintCost
    promise = func("", "")
      .from(contractInput)
      .fromP2PKH(bobInput, sig)
      .to([
        {
          to: alice.getDepositAddress(),
          amount: wantSats,
        },
        // bobs new token
        {
          to: toTokenaddr(bob.getTokenDepositAddress()),
          amount: 1000n,
          token: {
            category: genesisResponse.tokenIds![0],
            amount: 500n,
          },
        },
        // platform fee
        {
          to: platform.getDepositAddress(),
          amount: BigInt(platformFee),
        },
      ]);

    await promise.build();

    // bob's bch change
    (promise as any).outputs.at(-1).to = bob.getDepositAddress();
    (promise as any).outputs.at(-1).amount -= 2n;
    // console.log(getBitauthUri(await buildTemplate({contract, transaction: promise})))

    await promise.send();
    expect((await alice.getTokenUtxos()).length).toBe(0);
    expect(await bob.getTokenBalance(genesisResponse.tokenIds![0])).toBe(500);
    expect(await platform.getBalance("sat")).toBe(Number(platformFee));
  });

  test("swap bch for fungible", async () => {
    const funder = isTestnet
      ? await WalletClass.fromSeed(
          "excuse mother slide subject desert ability dad slab observe mandate tiger code",
          "m/44'/145'/0'/0/0"
        )
      : await WalletClass.fromId(process.env.ALICE_ID!);

    const alice = await WalletClass.newRandom();
    const bob = await WalletClass.newRandom();
    const platform = await WalletClass.newRandom();

    await funder.send([
      {
        cashaddr: alice.getDepositAddress(),
        value: 0.01,
        unit: "bch",
      },
      {
        cashaddr: bob.getDepositAddress(),
        value: 0.01,
        unit: "bch",
      },
    ]);
    await bob.sendMax(bob.cashaddr!);

    const genesisInput = (await bob.getAddressUtxos()).filter(
      (val) => !val.token && val.vout === 0
    )[0];
    const genesisResponse = await bob.tokenGenesis(
      {
        cashaddr: bob.getDepositAddress(),
        amount: 500,
      },
      undefined,
      { utxoIds: [genesisInput] }
    );
    const ownerPubKeyHash = hash160(
      alice.getPublicKeyCompressed() as Uint8Array
    );
    const wantSats = 1000n;
    const wantCategory =
      binToHex(hexToBin(genesisResponse.tokenIds![0]).reverse()) +
      capabilityMap[NFTCapability.none];
    const wantNFTCommitment = "";
    const wantFTs = 500n;
    const platformPubKeyHash = hash160(
      platform.getPublicKeyCompressed() as Uint8Array
    );
    const platformFee = 1000n;

    const contract = createContract({
      wantSats,
      wantCategory,
      wantNFTCommitment,
      wantFTs,
      ownerPubKeyHash,
      platformPubKeyHash,
      platformFee,
      network: isTestnet ? Network.TESTNET : Network.REGTEST,
    });

    const tailHash = sha256
      .hash(asmToBytecode(contract.artifact.bytecode))
      .slice(0, 4);
    const version = 0n;

    const response = await alice.send([
      new SendRequest({
        cashaddr: contract.getDepositAddress(),
        value: 10000,
        unit: "sat",
      }),
      OpReturnData.fromArray([
        "MPSW",
        bigIntToVmNumber(version),
        tailHash,
        platformPubKeyHash,
        bigIntToVmNumber(wantSats),
        hexToBin(wantCategory),
        hexToBin(wantNFTCommitment),
        bigIntToVmNumber(wantFTs),
        ownerPubKeyHash,
        bigIntToVmNumber(platformFee),
      ]),
    ]);

    const func = contract.getContractFunction("TradeOrCancel");
    const sig = getSignatureTemplate(bob);

    let contractUtxos = (await contract.getUtxos()).map(toCashScript);
    let contractInput = contractUtxos[0];

    let bobUtxos = (await bob.getTokenUtxos())
      .map(toCashScript)
      .filter((val) => val.token?.category === genesisResponse.tokenIds![0]);
    let bobInput: Utxo = bobUtxos[0];
    let promise: Transaction;

    // fail to mint, covent does not receive mintCost
    promise = func("", "")
      .from(contractInput)
      .fromP2PKH(bobInput, sig)
      .to([
        {
          to: alice.getTokenDepositAddress(),
          amount: 1000n,
          token: {
            category: genesisResponse.tokenIds![0],
            amount: 500n,
          },
        },
        // bobs bch
        {
          to: toTokenaddr(bob.getTokenDepositAddress()),
          amount: 546n, // precalculated fee
        },
        // platform fee
        {
          to: platform.getDepositAddress(),
          amount: platformFee,
        },
      ])
      .withoutChange()
      .withoutTokenChange();

    const proposal = await promise.build();

    (promise as any).outputs[1].to = bob.getDepositAddress();
    (promise as any).outputs[1].amount =
      contractInput.satoshis +
      bobInput.satoshis -
      1000n -
      BigInt(Math.ceil(proposal.length / 2)) -
      platformFee;

    // console.log(getBitauthUri(await buildTemplate({contract, transaction: promise})))

    await promise.send();
    expect(await platform.getBalance("sat")).toBe(Number(platformFee));
  });
});
