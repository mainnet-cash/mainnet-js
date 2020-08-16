export const p2pkTemplate: unknown = {
    entities: {
      ownerEntity: {
        name: 'Owner',
        scripts: ['lock', 'unlock'],
        variables: {
          owner: {
            description: 'The private key which controls this wallet.',
            name: "Owner's Key",
            type: 'Key',
          },
        },
      },
    },
    scripts: {
      celebrate: {
        script: 'OP_RETURN <"hello world">',
      },
      lock: {
        lockingType: 'standard',
        name: 'P2PK Lock',
        script:
          'OP_DUP\nOP_HASH160 <$( <owner.public_key> OP_HASH160\n)> OP_EQUALVERIFY\nOP_CHECKSIG',
      },
      unlock: {
        name: 'Unlock',
        script: '<owner.schnorr_signature.all_outputs>\n<owner.public_key>',
        unlocks: 'lock',
      },
    },
    supported: ['BCH_2019_05', 'BCH_2019_11'],
    version: 0,
  };