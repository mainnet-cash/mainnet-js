# mainnet-js

A high-level developer friendly interface to interact with Bitcoin Cash (BCH) network (prototype stage)

# Contents

- [mainnet-js](#mainnet-js)
- [Contents](#contents)
- [Before you begin](#before-you-begin)
  - [Unstable](#unstable)
  - [What is exactly is this? and how can I use it?](#what-is-exactly-is-this-and-how-can-i-use-it)
  - [Where can't mainnet-js be used (for now)](#where-cant-mainnet-js-be-used-for-now)
  - [Check Node Version](#check-node-version)
- [Installation](#installation)
  - [As a REST service](#as-a-rest-service)
  - [For webapps](#for-webapps)
- [Overview of packages](#overview-of-packages)
- [Documentation](#documentation)
- [Developer Guide](#developer-guide)
  - [Overview](#overview)
  - [1. Specification](#1-specification)
  - [2. Typescript library](#2-typescript-library)
  - [3. Running library tests](#3-running-library-tests)
    - [Speeding up testing](#speeding-up-testing)
  - [4. Update REST server](#4-update-rest-server)
  - [5. Implement REST service](#5-implement-rest-service)
  - [6. REST Testing](#6-rest-testing)
  - [7. Browser Testing](#7-browser-testing)
  - [8. Documentation](#8-documentation)
- [Demo app [WIP]](#demo-app-wip)
- [Developing API clients](#developing-api-clients)
- [Continuous Integration](#continuous-integration)
- [Continuous Deployment](#continuous-deployment)
  - [Deployment and package publishing](#deployment-and-package-publishing)
    - [Versioning](#versioning)
      - [Incrementing version](#incrementing-version)
      - [Incrementing other versions](#incrementing-other-versions)
      - [Enforcing certain version](#enforcing-certain-version)
    - [Publishing](#publishing)


# Before you begin

## Unstable


| :warning: WARNING          |
|:---------------------------|
| This code is in a prototype stage, so there is no backwards-compatibility guarantee.     |


## What is exactly is this? and how can I use it?

Mainnet-js provides a developer friendly API to develop BCH applications on the web.

It is an OpenAPI 3 specification (swagger), implemented as a library in typescript. That library is then used in a generated express server to provide a REST service. And that service can be deployed in a production stack via docker.

From there, clients can also be generated for most common languages, so you don't have to write javascript whatsoever to use mainnet-js.

However, the typescript library is also compiled for use directly in nodejs, or as ECMA script for webapps, or as a webpack bundle for use from a single file.

## Where can't mainnet-js be used (for now)

The core bitcoin library is [@bitauth/libauth](https://libauth.org/) which provides fast battle-tested crypto related functions using wasm binaries in WebAssembly.

For the above reason, mainnet-js is not well suited for use as a library supporting a React-Native or Vue-Native app, as the JSC for iOS and Android do not support WebAssembly, at the time of writing. Nor is it suitable for KaiOS devices below v3, for the same reason.

## Check Node Version

`mainnet` is currently developed and tested node v14, if your node version is very old or very new, you may have issues getting started. Check the nodejs version first.

Perhaps try [`nvm`](https://github.com/nvm-sh/nvm#about) to experiment if your issue occurs with different versions of node.

# Installation

  ## As a REST service

To run the rest service under docker (recommended) use:

    docker pull mainnet/mainnet-rest
    docker run -d --env WORKERS=5 -p 127.0.0.1:3000:80 mainnet/mainnet-rest


See the [full documentation](https://mainnet.cash/tutorial/running-rest.html) for more installation and configuration details.


  ## For webapps

To install mainnet as a dependency of your webapp use:
  
    yarn add mainnet-js

To include contracts and smartBCH functionality, use the following packages:

    yarn add @mainnet-cash/contract
    yarn add @mainnet-cash/smartbch

See the [full documentation](https://mainnet.cash/tutorial/shipping-mainnet.html) for notes and examples for bundling mainnet-js in your project.

# Overview of packages

This project contains a number of smaller projects in a mono-repo structure, with each package located in the [packages](packages/) folder.

| Project                | Description           |
| ---------------------- | --------------------- |
| mainnet-js             | Base Library          |
| mainnet-cash           | REST Express Server   |
| @mainnet-cash/smartbch | SmartBch Library      |
| @mainnet-cash/contract | CashScript Library    |
| @mainnet-cash/demo     | Demo Vue Webapp       |
| @mainnet-cash/root     | Top-level Placeholder |

# Documentation

Tutorials are available for both REST and javascript at [mainnet.cash](https://mainnet.cash)

Additionally, a live version of the current REST api is available for viewing at [rest-unstable.mainnet.cash](https://rest-unstable.mainnet.cash)

# Developer Guide

## Overview

Implementing even the simplest feature is a multi step process. It's fastest to follow these steps in order:

1. Write the finished REST specification
2. Implement the function in Typescript as closely to the pattern of the api spec as possible
3. **Fully test** the typescript functions
4. Rebuild the REST server from spec
5. Add required endpoint services, adding new files to .openapi-generator-ignore as necessary.
6. **Fully test** the rest endpoints
7. Finally, it must work in the browser, so, **fully test** an integrated workflow with a `*.test.headless.js` file.
8. Documentation

## 1. Specification

This is a specification driven project. The rest interface is defined using OpenAPI 3
in a folder called [swagger](swagger/v1/api.yml).

Changes may be validated using openapi-generator locally using:

    yarn api:validate

If you need better validation, you may also try [a swagger web editor](https://editor.swagger.io/)

## 2. Typescript library

All code for the javascript library should be contained in src/.

The javascript library is meant to mimic the REST API defined by the specification to the extent possible.

So the endpoint defined at `wallet/send` should match the behavior of `mywallet.send(...)` .

Prior to implementing a REST service, it is fastest to **thoroughly test** and debug issues in typescript.

## 3. Running library tests

To test the library, use:

    yarn test

The testing harness should automatically start a docker image with
a Bitcoin Cash Node and Fulcrum in regtest mode. The test covers
the library, as well as the rest API server.

### Speeding up testing

The test harness takes some time to start and mine coins. For this reason, it might be helpful to start it once and leave it running.

This can be done with:

```
yarn regtest:up
// &
yarn regtest:down
```

With regtest running, you may then run one-off tests like so:

```
SKIP_REGTEST_INIT=1 npx jest packages/mainnet-js/src/rate/ExchangeRate.test.t
```

or `yarn test:skip` run the suite of library tests.

## 4. Update REST server

The REST server service stubs and data validation are updated automatically to match the swagger spec with:

    api:build:server

This should generate stubs for any services and controllers needed, as well as copy the new spec to the server project.

**If you added new files to the express server and then modified them, they **must** be added to `.openapi-generator-ignore` in the server project root folder or the changes will be reverted when the server is regenerated from spec.**

## 5. Implement REST service

Implementing the rest service should be as easy as finding the generated stub and calling the function written in step 2, but it is sometimes more complex than that.


## 6. REST Testing

Tests for the express server may be run with:

    yarn test:rest

The `mainnet-js` package is sym-linked to the REST expressServer automatically by yarn workspaces. Updating `mainnet-js` with code changes is handled automatically by the `test:rest` command. If regtest is already running `yarn test:rest:skip`.

**If the mainnet-js library function being tested is not implemented correctly, no amount of debugging the service endpoint will cause it to work.**

If there are any failing tests in REST assure that similar coverage exists in `mainnet-js` src prior to debugging. Go back to step 3, or 2 if necessary.

When the REST service is successfully implemented and tested, it's a good idea to commit all code and regenerate the server to see if any files get reverted to stubs. 

Alternatively, this check is also performed as part of continuous integration.

## 7. Browser Testing

Browsers do not have access to many standard node libraries by design. For this reason, some libraries either don't work in the browser or don't work in nodejs.

All browser tests are denoted by `*.test.headless.js`.

The bundle is built with webpack and does **not** use browserify, rather it simply
omits nodejs libraries. Browser tests are run against testnet, using secrets stored
in a `.env.testnet` file or the environment variables `ALICE_TESTNET_ADDRESS`
and `ALICE_TESTNET_WALLET_ID`. These variables should be protected to the extent that
getting more testnet coins is an annoyance.

Integration tests for the browser can be run so:

    yarn test:browser

Unit testing is not as critical for the browser, but may be helpful in places, to narrow the scope of potential issues.

## 8. Documentation

Follow the instructions in the [mainnet-docs](https://github.com/mainnet-cash/mainnet-docs) to update documentation and examples for both javascript and REST usage.


# Demo app [WIP]

A simple demo is available to demonstrate and test first-class high-level functions and to run unit testing of functions when called in a webapp.

With the demo, concurrent unpublished dependencies are handled by `yarn workspaces`,
so you should be able to use a version of mainnet-js (et al.) that has been transpiled but doesn't exist on npm.

**However**, the following commands must be used from the root project directory.

Running yarn in the root folder will build local dependencies of the demo.

```
yarn
```

Compiles and hot-reloads for development

```
yarn demo:serve
```

Compiles and minifies for production

```
yarn demo:build
```

 Run Unit Tests

```
yarn demo:test
```

# Developing API clients

To generate clients in a particular language, use:

    yarn api:build:client <generator_name>

For a list of generators see:

https://openapi-generator.tech/docs/generators/

If you need additionalProperties passed to the client generator, these may be added in
he [wrapper script](swagger/generate.js)

# Continuous Integration

CI is run using github actions on the `master`, `feature/*` , `bugfix/*` , branches.

It's controlled by [a github action](.github/workflows/CI.yml) and runs the following actions:

- API validation
- Linting
- Typescript tests
- REST tests
- Browser tests
- Test coverage

Some steps require access to environment secrets in github to pass. Adding the secrets to your fork of the project on github can allow you to test using github actions run under your github account.

# Continuous Deployment


## Deployment and package publishing

The workflow is simple, bump the version, commit, push to github and create a release with a tag name equal to the version to which the project got bumped.

The github actions will then take care about everything else.

See details below.

### Versioning

The version format follows the `semver` - semantic versioning.

Use the `bump_version` utility to increment the project version. It will as well be propagated to swagger API version.

See https://github.com/npm/node-semver

#### Incrementing version

Execute `node bump_version.js` to simply increase the project's patch version.

#### Incrementing other versions

Use `node bump_version.js major`, `node bump_version.js minor`, `node bump_version.js patch` to increase x, y and z in the x.y.z version format, respectively.

Use `node bump_version.js prerelease rc`, `node bump_version.js prerelease alpha`, `node bump_version.js prerelease beta` to increase the prerelease version with rc, alpha or beta designations.

`node bump_version.js prerelease rc` will produce version `x.y.z-rc.0`. With `0` incrementing further to `1`, etc.

#### Enforcing certain version

Execute `node bump_version.js x.y.z` to set the project and swagger version to `x.y.z`

### Publishing

Upon creation of a new release on the github, the github publishing actions will be triggered.

Among these are:

- docker image with API REST server for self hosting `mainnet/mainnet-rest`, requires `DOCKERHUB_PASSWORD` secret
- rest server https://rest-unstable.mainnet.cash, requires `COMMIT_USER_TOKEN` secret, which is the github access token
- npm package `mainnet-js`, requires `NPM_TOKEN` secret
- python pypi package `mainnet` with autogenerated client, requires `PYPI_TOKEN` secret
- php composer package `mainnet/mainnet` with autogenerated client, requires `PACKAGIST_TOKEN` secret

Trying to republish/rerelease the same version will fail miserably
