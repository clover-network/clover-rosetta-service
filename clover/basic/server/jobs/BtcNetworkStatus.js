const { btc_rosetta_service } = require('../../config/config');
const _ = require('lodash');
const axios = require('axios');
const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Status = require('../../data/models/status');
const { getSender } = require('../../socket/socket');

async function run() {
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
  if (index !== _.parseInt(lastIndex)) {
    console.log('new btc block detected, reporting with block id: ', index);
    status.value = index;
    getSender() && getSender().send(JSON.stringify(body));
    await status.save();
  }
}

module.exports = {
  run
};
