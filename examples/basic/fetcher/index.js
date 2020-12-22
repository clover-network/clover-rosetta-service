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

const RosettaSDK = require('../../..');

// Create an instance of Fetcher
const fetcher = new RosettaSDK.Fetcher({
  server: {
    protocol: 'http',
    host: 'localhost',
    port: '8080',
  },
});

const main = (async function () {
  const { primaryNetwork, networkStatus } = await fetcher.initializeAsserter();

  console.log(`Primary Network: ${JSON.stringify(primaryNetwork)}`);
  console.log(`Network Status: ${JSON.stringify(networkStatus)}`);

  const block = await fetcher.blockRetry(
    primaryNetwork,
    new RosettaSDK.Utils.constructPartialBlockIdentifier(networkStatus.current_block_identifier),
  );

  console.log(`Current Block: ${JSON.stringify(block)}`);

  const blockMap = fetcher.blockRange(
    primaryNetwork,
    networkStatus.genesis_block_identifier.index,
    networkStatus.genesis_block_identifier.index + 10,
  );

  console.log(`Current Range: ${JSON.stringify(blockMap)}`);
});

main().catch(e => {
  console.error(e);
})
