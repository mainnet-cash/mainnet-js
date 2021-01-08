import {
  authenticationTemplateToCompilerBCH,
  bigIntToBinUint64LE,
  hexToBin,
  utf8ToBin,
  validateAuthenticationTemplate,
} from "@bitauth/libauth";
import bchaddr from "bchaddrjs-slp";

import { SendRequest } from "../wallet/model";
import { SlpGenesisOptions, SlpSendRequest, SlpUtxoI } from "../slp/interface";

import BigNumber from "bignumber.js";
import { DUST_UTXO_THRESHOLD } from "../constant";
import { UnitEnum } from "../enum";

export const bigIntToBinUint64BE = (value) => {
  const uint64Length = 8;
  const bin = new Uint8Array(uint64Length);
  const writeAsLittleEndian = false;
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  // eslint-disable-next-line functional/no-expression-statement
  view.setBigUint64(0, value, writeAsLittleEndian);
  return bin;
};

export const SlpGetGenesisOutputs = async (
  options: SlpGenesisOptions,
  genesis_token_receiver_cashaddr: string,
  mint_baton_receiver_cashaddr
) => {
  // explicitly convert initial amount to bignumber
  options.initialAmount = new BigNumber(options.initialAmount);
  if (options.initialAmount.isLessThanOrEqualTo(0)) {
    throw Error("Initial genesis token amount should be greater than zero");
  }

  if (options.decimalPlaces < 0 || options.decimalPlaces > 9) {
    throw new Error("Genesis allows decimal places between 0");
  }
  const cashAddrs = options.endBaton
    ? [genesis_token_receiver_cashaddr]
    : [genesis_token_receiver_cashaddr, mint_baton_receiver_cashaddr];
  const bchSendRequests = cashAddrs.map(
    (val) =>
      new SendRequest({
        cashaddr: bchaddr.toCashAddress(val),
        value: DUST_UTXO_THRESHOLD,
        unit: UnitEnum.SAT,
      })
  );

  const template = validateAuthenticationTemplate(SlpTxoTemplate);
  if (typeof template === "string") {
    throw new Error("Transaction template error");
  }
  const compiler = await authenticationTemplateToCompilerBCH(template);

  const rawTokenAmount = BigInt(
    options.initialAmount.shiftedBy(options.decimalPlaces)
  );

  const batonVout = options.endBaton ? 0x00 : 0x02;

  let genesisTxoBytecode = compiler.generateBytecode("genesis_lock", {
    bytecode: {
      g_token_ticker: utf8ToBin(options.ticker),
      g_token_name: utf8ToBin(options.name),
      g_token_document_url: utf8ToBin(
        options.documentUrl || "https://mainnet.cash"
      ),
      g_token_document_hash: hexToBin(
        options.documentHash ||
          "0000000000000000000000000000000000000000000000000000000000000000"
      ),
      g_decimals: Uint8Array.from([options.decimalPlaces]),
      g_mint_baton_vout: Uint8Array.from([batonVout]),
      g_initial_token_mint_quantity: bigIntToBinUint64BE(rawTokenAmount),
    },
  });
  if (!genesisTxoBytecode.success) {
    throw new Error(genesisTxoBytecode.toString());
  }

  return {
    SlpOutputs: [
      {
        lockingBytecode: genesisTxoBytecode.bytecode,
        satoshis: bigIntToBinUint64LE(BigInt(0)),
      },
    ],
    FundingSlpUtxos: [],
    BchSendRequests: bchSendRequests,
  };
};

export const SlpGetMintOutputs = async (
  slpBatonUtxos: SlpUtxoI[],
  tokenId: string,
  amount: BigNumber.Value,
  mint_tokens_receiver_cashaddr: string,
  mint_baton_receiver_cashaddr: string,
  endBaton: boolean = false
) => {
  const cashAddrs = endBaton
    ? [mint_tokens_receiver_cashaddr]
    : [mint_tokens_receiver_cashaddr, mint_baton_receiver_cashaddr];
  const bchSendRequests = cashAddrs.map(
    (val) =>
      new SendRequest({
        cashaddr: bchaddr.toCashAddress(val),
        value: DUST_UTXO_THRESHOLD,
        unit: UnitEnum.SAT,
      })
  );

  const template = validateAuthenticationTemplate(SlpTxoTemplate);
  if (typeof template === "string") {
    throw new Error("Transaction template error");
  }
  const compiler = await authenticationTemplateToCompilerBCH(template);
  const decimals = slpBatonUtxos[0].decimals;
  amount = new BigNumber(amount).shiftedBy(decimals);

  const batonVout = endBaton ? 0x00 : 0x02;

  let mintTxoBytecode = compiler.generateBytecode("mint_lock", {
    bytecode: {
      m_token_id: hexToBin(tokenId),
      m_mint_baton_vout: Uint8Array.from([batonVout]),
      m_additional_token_quantity: bigIntToBinUint64BE(BigInt(amount)),
    },
  });
  if (!mintTxoBytecode.success) {
    throw new Error(mintTxoBytecode.toString());
  }

  return {
    SlpOutputs: [
      {
        lockingBytecode: mintTxoBytecode.bytecode,
        satoshis: bigIntToBinUint64LE(BigInt(0)),
      },
    ],
    FundingSlpUtxos: slpBatonUtxos,
    BchSendRequests: bchSendRequests,
  };
};

export const SlpGetSendOutputs = async (
  slpUtxos: SlpUtxoI[],
  sendRequests: SlpSendRequest[]
) => {
  if (!slpUtxos.length) {
    throw new Error("No available tokens to spend");
  }

  // check this once again with fetched tokenId data
  const uniqueTockenIds = new Set(slpUtxos.map((val) => val.tokenId));
  if (uniqueTockenIds.size > 1) {
    throw Error(
      "You have two different token types with the same ticker. Pass tokenId parameter"
    );
  }

  const slpAvailableAmount: BigNumber = slpUtxos
    .map((val) => new BigNumber(val.amount))
    .reduce((a, b) => BigNumber.sum(a, b), new BigNumber(0));
  const slpSpendAmount: BigNumber = sendRequests
    .map((val) => new BigNumber(val.value))
    .reduce((a, b) => BigNumber.sum(a, b), new BigNumber(0));

  if (slpSpendAmount.isLessThanOrEqualTo(0)) {
    throw new Error("Refusing to spend 0 tokens");
  }

  if (slpSpendAmount.isGreaterThan(slpAvailableAmount)) {
    throw new Error("Not enough tokens to spend");
  }

  let fundingSlpUtxos: SlpUtxoI[] = [];
  let inputTokensRaw = new BigNumber(0);
  for (let slputxo of slpUtxos) {
    const amountTooLow = inputTokensRaw.isLessThan(slpSpendAmount);
    if (amountTooLow) {
      inputTokensRaw = inputTokensRaw.plus(slputxo.amount);
      fundingSlpUtxos.push(slputxo);
    } else {
      break;
    }
  }

  const bchSendRequests = sendRequests.map(
    (val) =>
      new SendRequest({
        cashaddr: bchaddr.toCashAddress(val.cashaddr),
        value: DUST_UTXO_THRESHOLD,
        unit: UnitEnum.SAT,
      })
  );

  const template = validateAuthenticationTemplate(SlpTxoTemplate);
  if (typeof template === "string") {
    throw new Error("Transaction template error");
  }
  const compiler = await authenticationTemplateToCompilerBCH(template);

  const change = slpAvailableAmount.minus(slpSpendAmount);
  let amounts = sendRequests.map((val) => new BigNumber(val.value));
  if (change.isGreaterThan(new BigNumber(0))) {
    amounts.push(change);
  }

  const decimals = slpUtxos[0].decimals;
  amounts = amounts.map((val) => val.shiftedBy(decimals));

  let result: Uint8Array = new Uint8Array();
  for (const amnt of amounts) {
    result = new Uint8Array([
      ...result,
      ...Uint8Array.from([8]),
      ...bigIntToBinUint64BE(BigInt(amnt)),
    ]);
  }

  const tokenId = slpUtxos[0].tokenId;

  let sendTxoBytecode = compiler.generateBytecode("send_lock", {
    bytecode: {
      s_token_id: hexToBin(tokenId!),
      s_token_output_quantities: result,
    },
  });
  if (!sendTxoBytecode.success) {
    throw new Error(sendTxoBytecode.toString());
  }

  return {
    SlpOutputs: [
      {
        lockingBytecode: sendTxoBytecode.bytecode,
        satoshis: bigIntToBinUint64LE(BigInt(0)),
      },
    ],
    FundingSlpUtxos: fundingSlpUtxos,
    BchSendRequests: bchSendRequests,
  };
};

// prettier-ignore
export const SlpTxoTemplate = {
  "$schema": "https://bitauth.com/schemas/authentication-template-v0.schema.json",
  "description": "SLP Token transaction output templates",
  "name": "SLP",
  "entities": {
    "genesis_variables": {
      "description": "Variables used in genesis template.",
      "name": "Genesis_Variables",
      "scripts": [
        "genesis_lock",
        "genesis_unlock"
      ],
      "variables": {
        "g_token_ticker": {
          "description": "0 to ∞ bytes, suggested utf-8",
          "name": "token_ticker",
          "type": "AddressData"
        },
        "g_token_name": {
          "description": "0 to ∞ bytes, suggested utf-8",
          "name": "token_name",
          "type": "AddressData"
        },
        "g_token_document_url": {
          "description": "0 to ∞ bytes, suggested ascii",
          "name": "token_document_url",
          "type": "AddressData"
        },
        "g_token_document_hash": {
          "description": "0 bytes or 32 bytes",
          "name": "token_document_hash",
          "type": "AddressData"
        },
        "g_decimals": {
          "description": "1 byte in range 0x00-0x09",
          "name": "decimals",
          "type": "AddressData"
        },
        "g_mint_baton_vout": {
          "description": "0 bytes, or 1 byte in range 0x02-0xff",
          "name": "mint_baton_vout",
          "type": "AddressData"
        },
        "g_initial_token_mint_quantity": {
          "description": "8 byte integer",
          "name": "initial_token_mint_quantity",
          "type": "AddressData"
        }
      }
    },
    "send_variables": {
      "description": "",
      "name": "Send_Variables",
      "scripts": [
        "send_lock",
        "send_unlock"
      ],
      "variables": {
        "s_token_id": {
          "description": "Token Id, genesis transaction hex",
          "name": "Token_Id",
          "type": "AddressData"
        },
        "s_token_output_quantities": {
          "description": "N 8 byte integer token amounts (up to 19). At least one is required. Each one is a push.\nN BCH transaction outputs should be specified",
          "name": "Token Output Quantities",
          "type": "AddressData"
        }
      }
    },
    "mint_variables": {
      "description": "",
      "name": "Mint_Variables",
      "scripts": [
        "mint_lock",
        "mint_unlock"
      ],
      "variables": {
        "m_token_id": {
          "description": "Token Id, genesis transaction hex",
          "name": "Token_Id",
          "type": "AddressData"
        },
        "m_mint_baton_vout": {
          "description": "0 bytes, or 1 byte in range 0x02-0xff",
          "name": "mint_baton_vout",
          "type": "AddressData"
        },
        "m_additional_token_quantity": {
          "description": "Amount of tokens to mint, 8 byte integer",
          "name": "Additinial token quantity",
          "type": "AddressData"
        }
      }
    }
  },
  "scenarios": {
    "genesis": {
      "data": {
        "bytecode": {
          "g_token_ticker": "0x00",
          "g_token_name": "0x00",
          "g_token_document_url": "0x00",
          "g_token_document_hash": "",
          "g_decimals": "0x09",
          "g_mint_baton_vout": "0x02",
          "g_initial_token_mint_quantity": "0x0102030405060708"
        }
      },
      "description": "Genesis",
      "name": "Genesis",
      "transaction": {
        "locktime": 100
      }
    },
    "send": {
      "data": {
        "bytecode": {
          "s_token_id": "0x0000000000000000'0000000000000000'0000000000000000'0000000000000000'",
          "s_token_output_quantities": "0x0000000000000000"
        }
      },
      "description": "Send",
      "name": "Send",
      "transaction": {
        "locktime": 100
      }
    },
    "mint": {
      "data": {
        "bytecode": {
          "m_token_id": "0x0000000000000000'0000000000000000'0000000000000000'0000000000000000'",
          "m_mint_baton_vout": "0x00",
          "m_additional_token_quantity": "0x0000000000000000"
        }
      },
      "description": "Mint",
      "name": "Mint",
      "transaction": {
        "locktime": 100
      }
    }
  },
  "scripts": {
    "genesis_unlock": {
      "fails": [
        "genesis"
      ],
      "name": "Genesis Unlock",
      "script": "// unlock script is required, so we leave it empty",
      "unlocks": "genesis_lock"
    },
    "send_unlock": {
      "fails": [
        "send"
      ],
      "name": "Send Unlock",
      "script": "",
      "unlocks": "send_lock"
    },
    "mint_unlock": {
      "fails": [
        "mint"
      ],
      "name": "Mint Unlock",
      "script": "",
      "unlocks": "mint_lock"
    },
    "genesis_lock": {
      "lockingType": "standard",
      "name": "Genesis",
      "script": "OP_RETURN <'SLP'0x00> $(<0x0101>) <'GENESIS'> <g_token_ticker> <g_token_name> <g_token_document_url> <g_token_document_hash> $(<0x01 g_decimals>) $(<0x01 g_mint_baton_vout>) $(<0x08 g_initial_token_mint_quantity>)"
    },
    "send_lock": {
      "lockingType": "standard",
      "name": "Send",
      "script": "OP_RETURN <'SLP'0x00> $(<0x0101>) <'SEND'> <s_token_id> $(<s_token_output_quantities>)"
    },
    "mint_lock": {
      "lockingType": "standard",
      "name": "Mint",
      "script": "OP_RETURN <'SLP'0x00> $(<0x0101>) <'MINT'> <m_token_id> $(<0x01 m_mint_baton_vout>) $(<0x08 m_additional_token_quantity>)"
    }
  },
  "supported": [
    "BCH_2020_05"
  ],
  "version": 0
}
