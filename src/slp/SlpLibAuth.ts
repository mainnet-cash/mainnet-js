export const SlpGenesisTemplate =
{
    $schema: "https://bitauth.com/schemas/authentication-template-v0.schema.json",
    description: "SLP Token Genesis transaction output",
    name: "SLP Genesis",
    entities: {
      vars: {
        description: "Variables used in template.",
        name: "Variables",
        scripts: [
          "lock",
          "unlock"
        ],
        variables: {
          token_ticker: {
            description: "0 to ∞ bytes, suggested utf-8",
            name: "token_ticker",
            type: "AddressData"
          },
          token_name: {
            description: "0 to ∞ bytes, suggested utf-8",
            name: "token_name",
            type: "AddressData"
          },
          token_document_url: {
            description: "0 to ∞ bytes, suggested ascii",
            name: "token_document_url",
            type: "AddressData"
          },
          token_document_hash: {
            description: "0 bytes or 32 bytes",
            name: "token_document_hash",
            type: "AddressData"
          },
          decimals: {
            description: "1 byte in range 0x00-0x09",
            name: "decimals",
            type: "AddressData"
          },
          mint_baton_vout: {
            description: "0 bytes, or 1 byte in range 0x02-0xff",
            name: "mint_baton_vout",
            type: "AddressData"
          },
          initial_token_mint_quantity: {
            description: "8 byte integer",
            name: "initial_token_mint_quantity",
            type: "AddressData"
          }
        }
      }
    },
    scenarios: {
      genesis: {
        data: {
          bytecode: {
            token_ticker: "0x00",
            token_name: "0x00",
            token_document_url: "0x00",
            token_document_hash: "",
            decimals: "0x09",
            mint_baton_vout: "0x02",
            initial_token_mint_quantity: "0x0102030405060708"
          }
        },
        description: "Genesis",
        name: "Genesis",
        transaction: {
          locktime: 100
        }
      }
    },
    scripts: {
      unlock: {
        fails: [
          "genesis"
        ],
        name: "Unlock",
        script: "// unlock script is required, so we leave it empty",
        unlocks: "lock"
      },
      lock: {
        lockingType: "standard",
        name: "Txo",
        script: "OP_RETURN <'SLP'0x00> $(<0x0101>) <'GENESIS'> <token_ticker> <token_name> <token_document_url> <token_document_hash> $(<0x01 decimals>) $(<0x01 mint_baton_vout>) $(<0x08 initial_token_mint_quantity>)"
      }
    },
    supported: [
      "BCH_2019_05",
      "BCH_2019_11",
      "BCH_2020_05"
    ],
    version: 0
};