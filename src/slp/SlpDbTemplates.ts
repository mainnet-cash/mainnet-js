// Slp Utxos for bch operation, to prevent accident burning of tokens and baton
// prettier-ignore
export const SlpAllUtxosTemplate = (cashaddr: string) => ({
    "v": 3,
    "q": {
        "db": ["g"],
        "aggregate": [
            {
                "$match": {
                    "graphTxn.outputs.address": cashaddr,
                    "graphTxn.outputs.status": {
                    "$in": [
                        "UNSPENT",
                        "BATON_UNSPENT"
                        ]
                    }
                }
            },
            {
                "$unwind": "$graphTxn.outputs"
            },
            {
                "$match": {
                    "graphTxn.outputs.address": cashaddr,
                    "graphTxn.outputs.status": {
                        "$in": [
                            "UNSPENT",
                            "BATON_UNSPENT"
                            ]
                        }
                }
            },
            {
                "$project": {
                    "graphTxn": 1
                }
            }
        ]
    },
    "r": {
      "f": "[ .[] | { txid: .graphTxn.txid, vout: .graphTxn.outputs.vout, satoshis: .graphTxn.outputs.bchSatoshis, value: .graphTxn.outputs.slpAmount, decimals: .graphTxn.details.decimals, ticker: .graphTxn.details.symbol, tokenId: .graphTxn.details.tokenIdHex } ]"
    }
});

// Slp Utxos for spending
// prettier-ignore
export const SlpSpendableUtxosTemplate = (cashaddr: string, tokenId?: string) => {
  let q = {
    "v": 3,
    "q": {
        "db": ["g"],
        "aggregate": [
            {
                "$match": {
                    "graphTxn.outputs.address": cashaddr,
                    "graphTxn.outputs.status": "UNSPENT"
                }
            },
            {
                "$unwind": "$graphTxn.outputs"
            },
            {
                "$match": {
                    "graphTxn.outputs.address": cashaddr,
                    "graphTxn.outputs.status": "UNSPENT"
                }
            },
            {
                "$project": {
                    "graphTxn": 1
                }
            },
            {
              "$lookup": {
                "from": "tokens",
                "localField": "graphTxn.details.tokenIdHex",
                "foreignField": "tokenDetails.tokenIdHex",
                "as": "token"
              }
            }
        ]
    },
    "r": {
      "f": "[ .[] | { txid: .graphTxn.txid, vout: .graphTxn.outputs.vout, satoshis: .graphTxn.outputs.bchSatoshis, value: .graphTxn.outputs.slpAmount, decimals: .token[0].tokenDetails.decimals, ticker: .token[0].tokenDetails.symbol, tokenId: .graphTxn.details.tokenIdHex } ]"
    }
  };

  if (tokenId) {
    (q["q"]["aggregate"] as any [])[0]["$match"]["graphTxn.details.tokenIdHex"] = tokenId;
  }

  // console.log(JSON.stringify(q, null, 2));

  return q;
}

// prettier-ignore
export const SlpAllTokenBalancesTemplate = (cashaddr: string) => {
  let q = {
    "v": 3,
    "q": {
      "db": ["g"],
      "aggregate": [
        {
          "$match": {
            "graphTxn.outputs.status": "UNSPENT",
            "graphTxn.outputs.address": cashaddr
          }
        },
        {
          "$unwind": "$graphTxn.outputs"
        },
        {
          "$match": {
            "graphTxn.outputs.status": "UNSPENT",
            "graphTxn.outputs.address": cashaddr
          }
        },
        {
          "$group": {
            "_id": "$tokenDetails.tokenIdHex",
            "slpAmount": {
              "$sum": "$graphTxn.outputs.slpAmount"
            }
          }
        },
        {
          "$sort": {
            "slpAmount": -1
          }
        },
        {
          "$lookup": {
            "from": "tokens",
            "localField": "_id",
            "foreignField": "tokenDetails.tokenIdHex",
            "as": "token"
          }
        },
        {
          "$match": {
            "slpAmount": {
              "$gt": 0
            }
          }
        }
      ],
      "sort": {
        "slpAmount": -1
       }
    },
    "r": {
      "f": "[ .[] | { value: .slpAmount, ticker: .token[0].tokenDetails.symbol, name: .token[0].tokenDetails.name, tokenId: ._id, } ]"
    }
  }

  return q;
}

// prettier-ignore
export const SlpTokenBalanceTemplate = (cashaddr: string, tokenId: string) => {
  let q = {
    "v": 3,
    "q": {
      "db": ["g"],
      "aggregate": [
        {
          "$match": {
            "tokenDetails.tokenIdHex": tokenId
          }
        },
        {
          "$match": {
            "graphTxn.outputs.status": "UNSPENT",
            "graphTxn.outputs.address": cashaddr
          }
        },
        {
          "$unwind": "$graphTxn.outputs"
        },
        {
          "$match": {
            "graphTxn.outputs.status": "UNSPENT",
            "graphTxn.outputs.address": cashaddr
          }
        },
        {
          "$group": {
            "_id": "$tokenDetails.tokenIdHex",
            "slpAmount": {
              "$sum": "$graphTxn.outputs.slpAmount"
            }
          }
        },
        {
          "$sort": {
            "slpAmount": -1
          }
        },
        {
          "$lookup": {
            "from": "tokens",
            "localField": "_id",
            "foreignField": "tokenDetails.tokenIdHex",
            "as": "token"
          }
        }
      ],
      "sort": {
        "slpAmount": -1
       }
    },
    "r": {
      "f": "[ .[] | { value: .slpAmount, ticker: .token[0].tokenDetails.symbol, name: .token[0].tokenDetails.name, tokenId: ._id, } ]"
    }
  }

  // console.log(JSON.stringify(q, null, 2));

  return q;
}

// prettier-ignore
export const SlpAddressTransactionHistoryTemplate = (address: string, tokenId?: string, limit: number = 100, skip: number = 0) => {
  const q = {
    "v": 3,
    "q": {
      "db": ["c", "u"],
      "find": {
        "$query": {
          "$or": [
              {"in.e.a": address},
              {"out.e.a": address},
            ],
          "$and": [
              {"slp.valid": true},
            ]
        },
      },
      "sort": {"blk.i": 1},
      "limit": limit,
      "skip": skip,
    },
    "r": {
      "f": "[ .[] | { tx_hash: .tx.h, height: .blk.i} ]"
    }
  };

  if (tokenId) {
      (q["q"]["find"]["$query"]["$and"] as any[]).push({"slp.detail.tokenIdHex": tokenId});
  }

  // console.log(JSON.stringify(q, null, 2));

  return q;
};

// prettier-ignore
export const SlpWaitForTransactionTemplate = (cashaddr: string, tokenId?: string) => {
  let q = {
    "v": 3,
    "q": {
      "db": ["c", "u"],
      "find": {
        "$or": [
          {
            "in.e.a": cashaddr
          },
          {
            "out.e.a": cashaddr
          }
        ]
      }
    }
  }

  if (tokenId) {
    q["q"]["find"]["slp.detail.tokenIdHex"] = tokenId;
  }

  return q;
};

// Lookup SLP token information
// prettier-ignore
export const SlpTokenInfoTemplate = (tokenId?: string, limit: number = 100, skip: number = 0) => {
  let q = {
    "v": 3,
    "q": {
      "db": ["t"],
      "find": {},
      "sort": {
        "tokenStats.approx_txns_since_genesis": -1
      },
      "limit": limit,
      "skip": skip,
    },
    "r": {
      "f": "[ .[] | { ticker: .tokenDetails.symbol, name: .tokenDetails.name, tokenId: .tokenDetails.tokenIdHex, decimals: .tokenDetails.decimals, documentUrl: .tokenDetails.documentUri, documentHash: .tokenDetails.documentSha256Hex, initialAmount: .tokenDetails.genesisOrMintQuantity } ]"
    }
  }

  if (tokenId) {
    q["q"]["find"]["tokenDetails.tokenIdHex"] = tokenId;
  }

  // console.log(q);

  return q;
}

// Slp Utxos for bch operation, to prevent accident burning of tokens and baton
// prettier-ignore
export const SlpBatonUtxosTemplate = (cashaddr: string, tokenId?: string) => {
  let q = {
    "v": 3,
    "q": {
        "db": ["g"],
        "aggregate": [
            {
                "$match": {
                    "graphTxn.outputs.address": cashaddr,
                    "graphTxn.outputs.status": "BATON_UNSPENT"
                }
            },
            {
                "$unwind": "$graphTxn.outputs"
            },
            {
                "$match": {
                    "graphTxn.outputs.address": cashaddr,
                    "graphTxn.outputs.status": "BATON_UNSPENT"
                }
            },
            {
                "$project": {
                    "graphTxn": 1
                }
            },
            {
              "$lookup": {
                "from": "tokens",
                "localField": "graphTxn.details.tokenIdHex",
                "foreignField": "tokenDetails.tokenIdHex",
                "as": "token"
              }
            }
        ]
    },
    "r": {
      "f": "[ .[] | { txid: .graphTxn.txid, vout: .graphTxn.outputs.vout, satoshis: .graphTxn.outputs.bchSatoshis, value: .graphTxn.outputs.slpAmount, decimals: .token[0].tokenDetails.decimals, ticker: .token[0].tokenDetails.symbol, tokenId: .graphTxn.details.tokenIdHex } ]"
    }
  }

  if (tokenId) {
    (q["q"]["aggregate"] as any [])[0]["$match"]["graphTxn.details.tokenIdHex"] = tokenId;
  }

  // console.log(JSON.stringify(q, null, 2));
  return q;
}
