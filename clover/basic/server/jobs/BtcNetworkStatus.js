const { btc_rosetta_service } = require('../../config/config');
const _ = require('lodash');
const axios = require('axios');
const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Status = require('../../data/models/status');

(async () => {
  const networkIdentifier = new RosettaSDK.Client.NetworkIdentifier('Bitcoin', 'Mainnet');
  const networkRequest = new Types.NetworkRequest.constructFromObject({
    network_identifier: networkIdentifier,
    metadata: {}
  });

  const status = await Status.findOne({
    where: {
      key: 'current_btc_block'
    }
  });
  const lastIndex = status.dataValues.value;
  const result = await axios.post(btc_rosetta_service + 'network/status', networkRequest);
  const body = result.data;
  const index = body.current_block_identifier.index;
  if (index !== lastIndex) {
    console.log('reported ', index, lastIndex);
    status.current_btc_block = index;
    await status.save();
  }

  console.log('done');
})();
