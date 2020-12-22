/**
 * Copyright (c) 2020 DigiByte Foundation NZ Limited
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// fetcher.test.js
const { expect } = require('chai');
const Rosetta = require('..');
const { constructPartialBlockIdentifier } = require('../lib/utils');
const bodyParser = require('body-parser');

let START_PORT = 8000;

function getPort() {
  return START_PORT++;
}

const c = (arg) => JSON.parse(JSON.stringify(arg));

const basicNetwork = {
  blockchain: "blockchain",
  network:    "network",
};

const basicAccount = {
  address: "address",
};

const basicBlock = {
  index: 10,
  hash:  "block 10",
};

const basicAmounts = [{
  value: "1000",
  currency: {
    symbol:   "BTC",
    decimals: 8,
  },
}];

const basicFullBlock = {
  block_identifier: basicBlock,
  parent_block_identifier: {
    index: 9,
    hash: "block 9",
  },
  timestamp: 1582833600000,
};

const basicNetworkStatus = {
  current_block_identifier: basicBlock,
  current_block_timestamp:  1582833600000,
  genesis_block_identifier: {
    index: 0,
    hash:  "block 0",
  },
};

const basicNetworkList = [
  basicNetwork,
];


const basicNetworkOptions = {
  version: {
    rosetta_version: "1.4.0",
    node_version:    "0.0.1",
  },
  allow: {
    operation_statuses: [
      {
        status:     "SUCCESS",
        successful: true,
      },
    ],
    operation_types: ["transfer"],
  },
};

async function createServer(params) {
  const app = require('express')();
  var tries = 0;

  app.use(bodyParser.json());

  app.post('/account/balance', (req, res) => {
    const expected = {
      network_identifier: basicNetwork,
      account_identifier: basicAccount,
    };

    expect(req.body).to.deep.equal(expected);

    if (tries < params.errorsBeforeSuccess) {
      tries++;
      res.status(500);
      return res.json({});
    }

    const response = new Rosetta.Client.AccountBalanceResponse(basicBlock, basicAmounts);
    res.json((response));
  });

  app.post('/block', (req, res) => {
    const expected = {
      network_identifier: basicNetwork,
      block_identifier: constructPartialBlockIdentifier(basicBlock),
    };

    expect(req.body).to.deep.equal(expected);

    if (tries < params.errorsBeforeSuccess) {
      tries++;
      res.status(500);
      return res.json({});
    }

    const response = new Rosetta.Client.BlockResponse(basicFullBlock);
    res.json((response));    
  });

  app.post('/network/status', (req, res) => {
    const expected = {
      network_identifier: basicNetwork,
      metadata: {},
    };

    const networkRequest = new Rosetta.Client.NetworkRequest(req.body);
    expect(req.body).to.deep.equal(expected);

    if (tries < params.errorsBeforeSuccess) {
      tries++;
      res.status(500);
      return res.json({});
    }

    const response = Rosetta.Client.NetworkStatusResponse.constructFromObject(basicNetworkStatus);
    res.json(response);        
  });

  app.post('/network/list', (req, res) => {
    const metadataRequest = new Rosetta.Client.MetadataRequest.constructFromObject({ metadata: {} });
    const expected = metadataRequest;

    expect(req.body).to.deep.equal(expected);

    if (tries < params.errorsBeforeSuccess) {
      tries++;
      res.status(500);
      return res.json({});
    }

    const response = new Rosetta.Client.NetworkListResponse(basicNetworkList);
    res.json(response);
  });  

  const server = app.listen(params.port || 8000, null);

  return server;
};

const launchServer = (options) => {
  return new Promise((fulfill, reject) => {
    let server;

    const cb = () => {
      createServer(options).then(s => {
        server = s;
        fulfill();
      });
    };

    if (server)
      server.close(cb);
    else
      cb();  
  });
};

describe('Fetcher', function () {
  describe('Test AccountBalanceRetry', function () {
    this.timeout(5000);

    it('no failures', async function () {
      const port = getPort();

      const server = await launchServer({
        errorsBeforeSuccess: 0,
        port,
      });

      const fetcher = new Rosetta.Fetcher({
        retryOptions: {
          numOfAttempts: 5,
        },
        server: {
          port,
        },
      });

      const { block, balances, metadata, coins } =
        await fetcher.accountBalanceRetry(basicNetwork, basicAccount, null);

      expect(block).to.deep.equal(basicBlock);
      expect(basicAmounts.map((amount) => {
        return Rosetta.Client.Amount.constructFromObject(amount);
      })).to.deep.equal(balances);

      return true;
    });

    it('retry failures', async function () {
      const port = getPort();

      const server = await launchServer({
        errorsBeforeSuccess: 2,
        port,
      });

      const fetcher = new Rosetta.Fetcher({
        retryOptions: {
          numOfAttempts: 5,
        },
        server: {
          port,
        },
      });

      const { block, balances, metadata } =
        await fetcher.accountBalanceRetry(basicNetwork, basicAccount, null);

      expect(basicBlock).to.deep.equal(block);
      expect(basicAmounts.map((amount) => {
        return Rosetta.Client.Amount.constructFromObject(amount);
      })).to.deep.equal(balances);
      expect(metadata).to.deep.equal(metadata);
      return true;      
    });

    it('exhausted failures', async function () {
      const port = getPort();

      const server = await launchServer({
        errorsBeforeSuccess: 2,
        port,
      });

      const fetcher = new Rosetta.Fetcher({
        retryOptions: {
          numOfAttempts: 1,
        },
        server: {
          port,
        },
      });

      try {
        const { block, balances, metadata } =
        await fetcher.accountBalanceRetry(basicNetwork, basicAccount, null);

      } catch(e) {
        expect(e.status).to.equal(500);
        return true;
      }

      throw new Error('Fetcher did exceed its max number of allowed retries');
    });
  });

  /**
   * BlockRetry
   */

  describe('Test BlockRetry', function () {
    this.timeout(5000);

    it('no failures', async function () {
      const port = getPort();

      const server = await launchServer({
        errorsBeforeSuccess: 0,
        port,
      });

      const fetcher = new Rosetta.Fetcher({
        retryOptions: {
          numOfAttempts: 5,
        },
        server: {
          port,
        },
      });

      const block =
        await fetcher.blockRetry(basicNetwork, constructPartialBlockIdentifier(basicBlock));

      expect(c(block)).to.deep.equal(basicFullBlock);
      return true;
    });

    it('retry failures', async function () {
      const port = getPort();

      const server = await launchServer({
        errorsBeforeSuccess: 2,
        port,
      });

      const fetcher = new Rosetta.Fetcher({
        retryOptions: {
          numOfAttempts: 5,
        },
        server: {
          port,
        },
      });

      const block =
        await fetcher.blockRetry(basicNetwork, constructPartialBlockIdentifier(basicBlock));

      expect(c(block)).to.deep.equal(basicFullBlock);
      return true;
    });

    it('exhausted failures', async function () {
      const port = getPort();

      const server = await launchServer({
        errorsBeforeSuccess: 2,
        port,
      });

      const fetcher = new Rosetta.Fetcher({
        retryOptions: {
          numOfAttempts: 1,
        },
        server: {
          port,
        },
      });

      try {
        const block =
          await fetcher.blockRetry(basicNetwork, constructPartialBlockIdentifier(basicBlock));

      } catch(e) {
        expect(e.status).to.equal(500);
        return true;
      }

      throw new Error('Fetcher did exceed its max number of allowed retries');
    });
  });  

  /*
   * NETWORK
   */

  describe('Test NetworkListRetry', function () {
    this.timeout(5000);

    it('no failures', async function () {
      const port = getPort();

      const server = await launchServer({
        errorsBeforeSuccess: 0,
        port,
      });

      const fetcher = new Rosetta.Fetcher({
        retryOptions: {
          numOfAttempts: 5,
        },
        server: {
          port,
        },
      });

      const networkList =
        await fetcher.networkListRetry({});

      const expectedResponse = new Rosetta.Client.NetworkListResponse(basicNetworkList);

      expect(c(networkList)).to.deep.equal(expectedResponse);
      return true;
    });

    it('retry failures', async function () {
      const port = getPort();

      const server = await launchServer({
        errorsBeforeSuccess: 2,
        port,
      });

      const fetcher = new Rosetta.Fetcher({
        retryOptions: {
          numOfAttempts: 5,
        },
        server: {
          port,
        },
      });

      const networkList =
        await fetcher.networkListRetry({});

      const expectedResponse = new Rosetta.Client.NetworkListResponse(basicNetworkList);

      expect(c(networkList)).to.deep.equal(expectedResponse);
      return true;
    });

    it('exhausted retries', async function () {
      const port = getPort();

      const server = await launchServer({
        errorsBeforeSuccess: 2,
        port,
      });

      const fetcher = new Rosetta.Fetcher({
        retryOptions: {
          numOfAttempts: 1,
        },
        server: {
          port,
        },
      });

      try {
        const networkList =
          await fetcher.networkListRetry({});

      } catch(e) {
        expect(e.status).to.equal(500);
        return true;
      }

      throw new Error('Fetcher did exceed its max number of allowed retries');            
    });    
  });

  describe('Test NetworkStatusRetry', function () {
    this.timeout(5000);

    it('no failures', async function () {
      const port = getPort();

      const server = await launchServer({
        errorsBeforeSuccess: 0,
        port,
      });

      const fetcher = new Rosetta.Fetcher({
        retryOptions: {
          numOfAttempts: 5,
        },
        server: {
          port,
        },
      });

      const networkList =
        await fetcher.networkStatusRetry(basicNetwork);

      expect(c(networkList)).to.deep.equal(basicNetworkStatus);
      return true;
    });

    it('retry failures', async function () {
      const port = getPort();

      const server = await launchServer({
        errorsBeforeSuccess: 2,
        port,
      });

      const fetcher = new Rosetta.Fetcher({
        retryOptions: {
          numOfAttempts: 5,
        },
        server: {
          port,
        },
      });

      const networkList =
        await fetcher.networkStatusRetry(basicNetwork);

      expect(c(networkList)).to.deep.equal(basicNetworkStatus);
      return true;
    });

    it('exhausted retries', async function () {
      const port = getPort();

      const server = await launchServer({
        errorsBeforeSuccess: 2,
        port,
      });

      const fetcher = new Rosetta.Fetcher({
        retryOptions: {
          numOfAttempts: 1,
        },
        server: {
          port,
        },
      });

      try {
        const networkList =
          await fetcher.networkStatusRetry(basicNetwork);

      } catch(e) {
        expect(e.status).to.equal(500);
        return true;
      }

      throw new Error('Fetcher did exceed its max number of allowed retries');      
    });    
  });
});