# Fetcher

## Description
The Fetcher package provides a simplified client interface to communicate with a Rosetta server. It also provides automatic retries and concurrent block fetches. All request methods return **Promises**.

If you want a lower-level interface to communicate with a Rosetta server, check out the Client.

## How to use?
Make sure to import the library:
```
const RosettaSDK = require('rosetta-node-sdk');
```

Here is how to create a basic fetcher with the default configuration:
```javascript
/** 
 * Default configuration:
 *   API Endpoint: http://localhost:8000
 *   Timeout: 5000
 *   Requesting resources with at most 10 requests, and no delay.
 */
const fetcher = new RosettaSDK.Fetcher();
```

You may also want to configure the fetcher:
```javascript
const fetcher = new RosettaSDK.Fetcher({
  /* See https://github.com/coveo/exponential-backoff#readme */
  retryOptions: {
    delayFirstAttempt: false,
    jitter: 'none',
    mayDelay: Infinity,
    numOfAttempts: 10,
    retry: () => true,
    startingDelay: 100,
    timeMultiple: 2,
  },

  /* You may either pass a custom instance of APIClient */
  apiClient: ApiClientInstance,

  /* Or configure the fetcher directly */
  server: {
    protocol = 'https',
    host = 'digibyte.one',
    port = 8000,
    timeout = 10000,

    /* See superagent documentation */
    requestAgent: requestAgentInstance
  },
});
```

Example request using the fetcher instance:
```javascript
const networkRequest = {
  blockchain: "blockchain",
  network:    "network",
};

const account = {
  address: "address",
};

const response = await fetcher.accountBalanceRetry(networkRequest, account);
```

## More examples
See [tests](../../test/fetcher.test.js) for detailed examples.
