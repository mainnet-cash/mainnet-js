# mainnet.js

A high-level developer friendly interface to interact with Bitcoin Cash (BCH) network (prototype stage)

# Unstable

This code is in a prototype stage, so there is no backwards-compatibility guarantee

# Installation

    git clone https://github.com/mainnet-cash/mainnet-js.git
    yarn

# Running library tests

    npx test

or (a bit slower):

    yarn test

The testing harness should automatically start a docker image with
 a Bitcoin Cash Node and Fulcrum in regtest mode. The test covers 
 the library, as well as the rest API server.

# Running browser tests

    npx test:browser

or

    yarn test:browser

Tests in the browser require for the library to be bundled for the browser. With:

    yarn build

The bundle is built with webpack and does **not** use browserify, rather it simply 
omits nodejs libraries. Browser tests are run against testnet, using secrets stored 
in a `.env.testnet` file or the environment variables `ALICE_TESTNET_ADDRESS` 
and `ALICE_TESTNET_WALLET_ID`.  These variables should be protected to the extent that
getting more testnet coins is an annoyance.

# Workflow

This is a specification driven project.  The rest interface is defined using OpenAPI 3 
in a folder called [swagger](swagger/v1/api.yml).  

Changes may be validated using openapi-generator locally using:

    npx api:validate

Any changes to the server, generated clients or documentation will be reflected 
after validation and committed automatically in CI.

Details about the 