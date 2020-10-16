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
and `ALICE_TESTNET_WALLET_ID`. These variables should be protected to the extent that
getting more testnet coins is an annoyance.

# Workflow

## Specification

This is a specification driven project. The rest interface is defined using OpenAPI 3
in a folder called [swagger](swagger/v1/api.yml).

Changes may be validated using openapi-generator locally using:

    npm run api:validate

## Extending the core library

All code for the javascript bundle should be contained in src/, high level function
calls should be as close to the swagger specification as possible.

Tests may be run with:

    npm run test

Note this also tests the API server, which depends on the bundled output of src/

    npm run build

## Updating the API server

Any changes to the server or documentation will be reflected
after validation and committed automatically in CI.

The API server is build already, but to rebuild it manually use:

    npm run api:build:server

The server uses a nodejs packaged version of the library

    npm run build

To start the API server for development:

    npm run api:serve

To run multiple instances of the API server in "cluster" mode:

    npm run api:serve:cluster

## Developing API clients

To generate clients in a particular language, use:

    npm run api:build:client <generator_name>

For a list of generators see:

https://openapi-generator.tech/docs/generators/

If you need additionalProperties passed to the client generator, these may be added in
he [wrapper script](swagger/generate.js)
