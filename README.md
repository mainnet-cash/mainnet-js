# mainnet.js

A high-level developer friendly interface to interact with Bitcoin Cash (BCH) network (prototype stage)

# Unstable

This code is in a prototype stage, so there is no backwards-compatibility guarantee

# Before you begin

## Node Version

`mainnet` is currently developed and tested node v14, if your node version is very old or very new, you may have issues getting started.

Perhaps try [`nvm`](https://github.com/nvm-sh/nvm#about) to experiment if your issue occurs with different versions of node.

## What is this project? and how do I use it?

Mainnet-js strives to provide an easy to use API to develop BCH applications on the web.

It is an OpenAPI 3 specification (swagger), implemented as a library in typescript. That library is then used in a generated express server to provide a REST service. And that service can be deployed in a production stack via docker.

Clients can also be generated for most common languages, so you don't have to use javascript whatsoever to use mainnet-js.

However, the typescript library is also compiled for use directly in nodejs, or as ECMA script for webapps, or as a webpack bundle for use from a single file.

The core bitcoin library is [@bitauth/libauth](https://libauth.org/) which provides crypto related functions using wasm binaries.

For the above reason, mainnet-js is not well suited for use as a library supporting a React-Native or Vue-Native app, as the JSC for iOS and Android do not support WebAssembly, but may in the future.

# Installation

    git clone https://github.com/mainnet-cash/mainnet-js.git
    yarn

# Mono-Repository Structure

This project contains a number of smaller projects in a mono-repo structure, with each package located in the [packages](packages/) folder.

| Project                | Description           |
| ---------------------- | --------------------- |
| mainnet-js             | Core TS Library       |
| mainnet-cash           | REST Express Server   |
| @mainnet-cash/smartbch | SmartBch Library      |
| @mainnet-cash/contract | CashScript Library    |
| @mainnet-cash/demo     | Demo Vue Webapp       |
| @mainnet-cash/root     | Top-level Placeholder |

# Demo 

With the demo, concurrent unpublished dependencies are handled by `yarn workspaces`, 
so you should be able to use a version of mainnet-js (et al.) that has been transpiled but doesn't exist on npm.

**However**, the following commands must be used from the root project directory.

## Project setup
```
yarn
```

### Compiles and hot-reloads for development
```
yarn demo:serve
```

### Compiles and minifies for production
```
yarn demo:build
```

### Run Tests
```
yarn demo:test
```

# Running library tests

    yarn test

The testing harness should automatically start a docker image with
a Bitcoin Cash Node and Fulcrum in regtest mode. The test covers
the library, as well as the rest API server.

# Running browser tests

    yarn test:browser

Tests in the browser require for the library to be bundled for the browser. With:

    yarn build

The bundle is built with webpack and does **not** use browserify, rather it simply
omits nodejs libraries. Browser tests are run against testnet, using secrets stored
in a `.env.testnet` file or the environment variables `ALICE_TESTNET_ADDRESS`
and `ALICE_TESTNET_WALLET_ID`. These variables should be protected to the extent that
getting more testnet coins is an annoyance.

# Development Workflow

## Overview

To implement even the simplest function, is a multi step process. It's fastest to follow these steps in order:

1. Write the finished REST specification
2. Implement the function in Typescript as closely to the pattern of the spec as possible
3. **Fully test** the typescript functions
4. Rebuild the REST server from spec
5. Add required endpoint services, adding new files to .openapi-generator-ignore as necessary.
6. **Fully test** the rest endpoints
7. Finally, it must work in the browser so, **fully test** an integrated workflow with a `*.test.headless.js` file.

## Specification

This is a specification driven project. The rest interface is defined using OpenAPI 3
in a folder called [swagger](swagger/v1/api.yml).

Changes may be validated using openapi-generator locally using:

    yarn api:validate

If you need better validation, you may also try [a swagger web editor](https://editor.swagger.io/)

## Typescript library

All code for the javascript library should be contained in src/.

The javascript library is meant to mimic the REST API defined by the specification to the extent possible.

So the endpoint defined at `wallet/send` should match the behavior of `mywallet.send(...)` .

Prior to implementing a REST service, it is fastest to **thoroughly test** and debug issues in typescript.

# Running library tests

To test the library, use:

    yarn test

The testing harness should automatically start a docker image with
a Bitcoin Cash Node and Fulcrum in regtest mode. The test covers
the library, as well as the rest API server.

## Speeding up testing

The test harness 

## REST Testing

Tests for the express server may be run with:

    yarn test:rest

The `mainnet-js` package is sym-linked to the REST expressServer automatically by yarn workspaces. Updating `mainnet-js` with code changes is handled automatically by the `test:rest` command.

If the mainnet-js library function being tested is not implemented correctly, no amount of debugging the service endpoint will cause it to work.

If there are any failing tests in REST assure that similar coverage exists in `mainnet-js` src prior to debugging.

## Browser Testing

Browsers do not have access to many standard node libraries by design. For this reason, some libraries either don't work in the browser or don't work in nodejs.

All browser tests are denoted by `*.test.headless.js`.

Tests in the browser require for the library to be bundled for the browser. With:

    yarn

The bundle is built with webpack and does **not** use browserify, rather it simply
omits nodejs libraries. Browser tests are run against testnet, using secrets stored
in a `.env.testnet` file or the environment variables `ALICE_TESTNET_ADDRESS`
and `ALICE_TESTNET_WALLET_ID`. These variables should be protected to the extent that
getting more testnet coins is an annoyance.

Integration tests for the browser can be run so:

    yarn test:browser

Unit testing is not as critical for the browser, but may be helpful in places, to narrow the scope of potential issues.


## Developing API clients

To generate clients in a particular language, use:

    yarn api:build:client <generator_name>

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

The workflow is simple, bump the version, commit, push to github and create a release with a tag name equal to the version to which the project got bumped.

The github actions will then take care about everything else.

See details below.

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

Trying to republish/rerelease the same version will fail miserably
