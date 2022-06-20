# mainnet-js

A high-level developer friendly interface to interact with Bitcoin Cash (BCH) network (prototype stage)

# Contents

- [mainnet-js](#mainnet-js)
- [Contents](#contents)
- [Before you begin](#before-you-begin)
  - [Unstable](#unstable)
  - [What is exactly is this?](#what-is-exactly-is-this)
  - [How can I use it?](#how-can-i-use-it)
  - [Where can't mainnet-js be used? (for now)](#where-cant-mainnet-js-be-used-for-now)
  - [Finaly, Check Your Node Version First](#finaly-check-your-node-version-first)
- [Installation](#installation)
  - [As a REST service](#as-a-rest-service)
  - [For webapps & nodejs](#for-webapps--nodejs)
  - [REST clients for other languages](#rest-clients-for-other-languages)
- [Overview of packages](#overview-of-packages)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Demo app [WIP]](#demo-app-wip)

# Before you begin

## Unstable

| :warning: WARNING                                                                |
| :------------------------------------------------------------------------------- |
| This code is in a alpha stage, so there is no backwards-compatibility guarantee. |

## What is exactly is this?

Mainnet-js provides a developer friendly API to develop BCH applications.

It is an OpenAPI 3 specification (swagger), implemented as a library in typescript. That library is then used in a generated express server to provide a REST service. And that service can be deployed in a production stack via docker.

## How can I use it?

The rest service can be called as a REST api from any language that can POST and receive json. Additionally, client libraries can be generated automatically if preferred in [most common languages](https://openapi-generator.tech/docs/generators/). You don't need to write javascript or typescript to use mainnet.

However, the typescript library is also compiled for use directly in nodejs, or as ECMA script for webapps, or as a webpack bundle for use from a single file.

So it can be used in the browser, nodejs, electrum apps, WebWorkers and the like.

## Where can't mainnet-js be used? (for now)

The core bitcoin library is [@bitauth/libauth](https://libauth.org/) which provides fast battle-tested crypto related functions using wasm binaries in WebAssembly.

For the above reason, mainnet-js is not well suited for use as a javascript library supporting a React-Native or Vue-Native app, as the JSC for iOS and Android do not support WebAssembly, at the time of writing (It may be possible with WebView, but with tradeoffs). Nor is it suitable for KaiOS devices below v3, for the same reason.

## Finaly, Check Your Node Version First

`mainnet` is currently developed and tested node v14, if your node version is very old or very new, you may have issues getting started. Check the nodejs version first.

Perhaps try [`nvm`](https://github.com/nvm-sh/nvm#about) to experiment if your issue occurs with different versions of node.

# Installation

## As a REST service

To run the rest service under docker (recommended) use:

    docker pull mainnet/mainnet-rest
    docker run -d --env WORKERS=5 -p 127.0.0.1:3000:80 mainnet/mainnet-rest

See the [full documentation](https://mainnet.cash/tutorial/running-rest.html) for more installation and configuration details.

## For webapps & nodejs

To install mainnet as a dependency of your webapp use:

    yarn add mainnet-js

To include contracts and smartBCH functionality, use the following packages:

    yarn add @mainnet-cash/contract
    yarn add @mainnet-cash/smartbch

See the [full documentation](https://mainnet.cash/tutorial/shipping-mainnet.html) for notes and examples for bundling mainnet-js in your project.

## REST clients for other languages

It may be possible to use a generated client in your preferred programming language to interact with your REST service.

Client libraries are pre-built and available in [python](https://github.com/mainnet-cash/mainnet-python-generated), [php](https://github.com/mainnet-cash/mainnet-php-generated) and [golang](https://github.com/mainnet-cash/mainnet-go-generated).

If you have docker installed, you can generate clients in a particular language from the project folder using:

    yarn api:build:client <generator_name>

For a list of generators see:

https://openapi-generator.tech/docs/generators/

If you need additionalProperties passed to the client generator, these may be added in the [wrapper script](swagger/generate.js)

# Overview of packages

This project contains a number of smaller projects in a mono-repo structure, with each package located in the [packages](packages/) folder.

| Project                | Description           |
| ---------------------- | --------------------- |
| mainnet-js             | Base Library          |
| mainnet-cash           | REST Express Server   |
| @mainnet-cash/smartbch | SmartBch Library      |
| @mainnet-cash/contract | CashScript Library    |
| @mainnet-cash/demo     | Demo Vue Webapp       |
| @mainnet-cash/demo-min | Minimal Demo          |
| @mainnet-cash/root     | Top-level Placeholder |

# Documentation

Tutorials are available for both REST and javascript at [mainnet.cash](https://mainnet.cash)

Additionally, a live version of the current REST api is available for viewing at [rest-unstable.mainnet.cash](https://rest-unstable.mainnet.cash)

# Contributing

Please see the [contributing guide](./CONTRIBUTING.md) for more detailed information.

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
