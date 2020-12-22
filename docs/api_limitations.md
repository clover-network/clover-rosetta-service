# API Limitations
This Rosetta JS SDK contains a port of every essential core component that is available in the offical Go reference implementation, except a few exceptions:

☑️ Asserter
☑️ Controllers
☑️ Fetcher
☑️ Parser
☑️ Reconciler
☑️ Server
❌ Keys (may be ported to NodeJS in future)

# Client Package
This project makes extensive use of the Rosetta Client Library [`rosetta-node-sdk-client`](https://github.com/SmartArray/rosetta-node-sdk-client), that was generated with the OpenAPI Generator. 
It does not contain TypeScript Wrappers. So if you want to use Typescript Classes for your server implementation, you should generate your own using the OpenAPI Generator Toolsuite.