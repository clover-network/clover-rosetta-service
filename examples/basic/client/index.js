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
const RosettaClient = RosettaSDK.Client;

// Create an instance of APIClient and configure it.
const APIClient = new RosettaClient.ApiClient();
APIClient.basePath = 'http://localhost:8080';
APIClient.agent = 'rosetta-sdk-node';
APIClient.timeout = 10 * 1000; // 10 seconds

async function startClient() {
  // Step1: Create an instance of RosettaSDK Client
  const networkAPI = new RosettaClient.NetworkApi(APIClient).promises;

  // Step 2: Get all available networks
  const metadataRequest = new RosettaClient.MetadataRequest();
  const networkList = await networkAPI.networkList(metadataRequest);
  if (networkList.network_identifiers.length == 0) {
    console.error('Server did not respond with any network identifier');
    return;
  }

  // Step 3: Print the primary network
  const primaryNetwork = networkList.network_identifiers[0];
  console.log(`Primary Network: ${primaryNetwork}`);

  // Step 4: Fetch the network status
  const networkRequest = new RosettaClient.NetworkRequest(primaryNetwork);
  const networkStatus = await networkAPI.networkStatus(networkRequest);

  // Step 5: Print Network Status
  console.log(`Network Status: ${networkStatus}`);

  // Step 6: Asserter (ToDo?)
  // Response Assertions are already handled by the server.

  // Step 7: Fetch the Network Options
  const networkOptions = await networkAPI.networkOptions(networkRequest);

  // Step 8: Print Network Options
  console.log(`Network Options: ${networkOptions}`);

  // Step 9: Asserter (ToDo?), refer to step 6.
  // Step 10: ClientAsserter, refer to step 6.
  // ...

  // Step 11: Fetch current block
  const blockIdentifier = RosettaClient.PartialBlockIdentifier.constructFromObject({
    hash: networkStatus.current_block_identifier,
  });
  const blockRequest = new RosettaClient.BlockRequest(primaryNetwork, blockIdentifier);
  const block = await networkAPI.block(blockRequest);

  // Step 12: Print the block
  console.log(`Current Block: ${block}`);

  // Step 13: Assert the block response is valid, refer to step 6

  // Step 14: Print transactions in that block
  block.OtherTransactions.forEach(tx => {
    console.log(`  Transaction: ${tx}`);
  });
};

startClient()
  .catch(e => console.error(e));
