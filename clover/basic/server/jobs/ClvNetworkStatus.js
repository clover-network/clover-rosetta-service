const { networkStatus } = require('../../chains/clover/NetworkService');
const _ = require('lodash');
const axios = require('axios');
const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Status = require('../../data/models/status');
const { getSender } = require('../../socket/socket');

async function run() {
  const status = await Status.findOne({
    where: {
      key: 'current_clv_block'
    }
  });
  const lastIndex = status.dataValues.value;
  const body = await networkStatus();
  const index = body.current_block_identifier.index;
  if (index !== _.parseInt(lastIndex)) {
    console.log('new clv block detected, reporting with block id: ', index);
    status.value = index;
    const response = {
      type: 'network/status',
      meta: {
        network_identifier:{
          blockchain: 'Clover',
          network: 'Mainnet'
        },
      },
      data: body
    };
    getSender() && getSender().send(JSON.stringify(response));
    await status.save();
  }
}

module.exports = {
  run
};
