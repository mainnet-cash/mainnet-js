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

# Configuration Variables

## Express

    PORT=3000  # The port express will run on
    URL_PATH   # The url express is serving from

    WORKERS=10 # How many threads to run express on
    TIMEOUT=60 # sets the default timeout for requests

### Database

Postgres configuration is passed url encoded

    DATABASE_URL='postgres://postgres:trusted@localhost:15432/wallet'

By default, the API service assumes it is connected to a secured private postgres database. If you intend to expose the api to the general public this setting **MUST** be changed to **'false'**, default is true.

    ALLOW_MAINNET_USER_WALLETS=true

## Wallet Behavior

**In nodejs only**, Controls the number responses from electrum-cash nodes that must be in agreement for a network response to return

    CLUSTER_CONFIDENCE=1

## Mining

If you would like to mine some regtest coins, the following environment variables are used:

    RPC_USER="alice"
    RPC_PASS="password"
    RPC_PORT=18443
    RPC_HOST=bitcoind

The above variables should be configured already in `.env.regtest` for integration tests against docker services

## Regtest Wallet

Below are the public and private keys for a regtest wallet

    ADDRESS="bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0"
    ADDRESS_LEGACY="18uVyRcvE7RdR9WFLyD1kMPjehKxyE91in"
    PRIVATE_WIF="cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    PRIVATE_SEED="pink wash guitar agree screen suspect soon misery dog menu issue recipe"

## Testnet Wallet

For now, testnet integration tests use static wallets:

    ALICE_TESTNET_ADDRESS   # A testnet address    ALICE_TESTNET_WALLET_ID # A wallet in mainnet serialized format
    BOB_TESTNET_ADDRESS     # A wallet for the Bob
    BOB_TESTNET_WALLET_ID   # His serialized walletId

These will be removed at a later date when an API is configured.

# Deployment and package publishing

Both are done with github actions upon creation of a new release on github.

By convention the github release version and `package.json` versions should be the same.

## Versioning

The version format follows the `semver` - semantic versioning.

Use the `bump_version` utility to increment the project version. It will as well be propagated to swagger API version.

See https://github.com/npm/node-semver

### Incrementing version

Execute `node bump_version.js` to simply increase the project's patch version.

### Incrementing other versions

Use `node bump_version.js major`, `node bump_version.js minor`, `node bump_version.js patch` to increase x, y and z in the x.y.z version format, respectively.

Use `node bump_version.js prerelease rc`, `node bump_version.js prerelease alpha`, `node bump_version.js prerelease beta` to increase the prerelease version with rc, alpha or beta designations.

`node bump_version.js prerelease rc` will produce version `x.y.z-rc.0`. With `0` incrementing further to `1`, etc.

### Enforcing certain version

Execute `node bump_version.js x.y.z` to set the project and swagger version to `x.y.z`

## Publishing

Upon creation of a new release on the github, the github publishing actions will be triggered.

Among these are:

- docker image with API REST server for self hosting `mainnet/mainnet-rest`, requires `DOCKERHUB_PASSWORD` secret
- rest server https://rest-unstable.mainnet.cash, requires `COMMIT_USER_TOKEN` secret, which is the github access token
- npm package `mainnet-js`, requires `NPM_TOKEN` secret
- python pypi package `mainnet` with autogenerated client, requires `PYPI_TOKEN` secret
- php composer package `mainnet/mainnet` with autogenerated client, requires `PACKAGIST_TOKEN` secret
