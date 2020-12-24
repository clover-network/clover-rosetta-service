const { eth_rosetta_service } = require('../../config/config');
const _ = require('lodash');
const axios = require('axios');
const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;

(async () => {
  const networkIdentifier = new RosettaSDK.Client.NetworkIdentifier('Ethereum', 'Mainnet');
  const networkRequest = new Types.NetworkRequest.constructFromObject({
    network_identifier: networkIdentifier,
    metadata: {}
  });
  const result = await axios.post(eth_rosetta_service + 'network/status', payload);
  console.log(result);
})();
