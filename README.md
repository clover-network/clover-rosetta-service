<p align="center">
  <a href="https://www.rosetta-api.org">
    <img width="90%" alt="Rosetta" src="https://www.rosetta-api.org/img/rosetta_header.png">
  </a>
</p>
<h3 align="center">
   Rosetta SDK
</h3>
<p align="center">
NodeJS Rosetta SDK to create and interact with Rosetta API Implementations
</p>
<p align="center">
  <!--<a href="https://circleci.com/gh/DigiByte-Core/digibyte-rosetta-nodeapi/tree/master"><img src="https://circleci.com/gh/DigiByte-Core/digibyte-rosetta-nodeapi/tree/master.svg?style=shield" /></a>-->
  <a href="https://coveralls.io/github/DigiByte-Core/digibyte-rosetta-nodeapi"><img src="https://coveralls.io/repos/github/DigiByte-Core/digibyte-rosetta-nodeapi/badge.svg" /></a>
  <a href="https://github.com/DigiByte-Core/digibyte-rosetta-nodeapi/blob/master/LICENSE.txt"><img src="https://img.shields.io/github/license/DigiByte-Core/digibyte-rosetta-nodeapi.svg" /></a>
</p>

# RosettaSDK (JS) [experimental]
Supported Rosetta Protocol Version: 1.4.1

This project is a port of the official Go reference implementation. All features, except a [few exceptions](docs/api_limitations.md), have been ported to JS.

## Motivation
Coinbase's [Official Go Reference Implementation](https://github.com/coinbase/rosetta-sdk-go.git) is a thouroughly tested and wonderful SDK Implementation. However, as many developers are better suited to use NodeJS/Javascript, DigiByte decided to port the reference implementation to NodeJS while maintaining support for all it's core components.  

## Documentation

### Prerequisites
- NodeJS >= 10.6
- NPM >= 6.10.0

The code was written on a Mac, so assuming all should work smoothly on Linux-based computers. However, there is no reason not to run this library on Windows-based machines. If you find an OS-related problem, please open an issue and it will be resolved.

### Installation
```bash
npm install --save rosetta-node-sdk
```

### Tests
This project is thoroughly tested using > 300 automated tests. Run `npm run test` to see how they all work out.

### Usage
All Core components are accessible as follows:
```Javascript
const RosettaSDK = require('rosetta-node-sdk');
const {
  Asserter,
  Server,
  Reconciler,
  Client,
  Fetcher,
  Syncer,
  Parser,
  SyncerEvents,
  Errors,

  Utils,
  InternalModels,

  logger,

  version, // '1.4.1'
} = RosettaSDK;
```

### Components
- **Asserter** - Syntactical and semantical type validator. This Asserter can be used to validate Requests/Responses. Constructors exist that ease the creation of an asserter. For example, `NewClientWithResponses` can be used in order to create a server validator by only passing the network responses.
- **Server** - The Server Component eases the development of a custom server implementation. Examples on how to build such a server are located in [examples](./examples).
- **Reconciler** - Use the Reconciler in order to validate that the balances computed by parsing the blocks are the equal to the balances computed by a node.
- **Client** - Client request library [`rosetta-node-sdk-client`](https://github.com/SmartArray/rosetta-node-sdk-client)
- **Fetcher** - Convenience Wrapper Class for `Client`
- **Syncer** - Makes use of `Fetcher` class in order to download blocks in logical order.
- **Parser** - Parses and groups BalanceOperations of a block. 
- **SyncerEvents** - Syncer Events. Mainly `BLOCK_ADDED`, `BLOCK_REMOVED`, `SYNC_CANCELLED`
- **Errors** - Error Classes for the different components: `AsserterError`, `FetcherError`, `InputError`, `ParserError`, `InternalError`,  `ReconcilerError`, `SyncerError`. 
- **Utils** - Utility functions, commonly used internally by the core components.
- **InternalModels** - Models, that are commonly used internally.
- **logger** - Default Logger Singleton Class.
- **version** - Specifies the version of this SDK. This semver is equal to the Rosetta API SDK for convencience.

### ToDos
- [ ] Setup CI (`npm run test` will execute 313 tests)
- [ ] Support `keys` (cryptographic API) 
- [ ] Documentation 
- [ ] Test Reconciler in live environment
