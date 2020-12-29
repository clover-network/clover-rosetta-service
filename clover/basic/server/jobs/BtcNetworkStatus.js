const { btc_rosetta_service } = require('../../config/config');
const _ = require('lodash');
const axios = require('axios');
const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Status = require('../../data/models/status');
const { getSender } = require('../../socket/socket');
const { sleep } = require('../../utils/utils');

async function doRun() {
  try {
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
    body.peers = [];
    if (index !== _.parseInt(lastIndex)) {
      console.log('new btc block detected, reporting with block id: ', index);
      status.value = index;
      const response = {
        type: 'network/status',
        meta: {
          network_identifier:{
            blockchain: 'Bitcoin',
            network: 'Mainnet'
          },
        },
        data: body
      };
      // getSender() && getSender().send(JSON.stringify(response));
      await status.save();
    }
  } catch (e) {
    console.error(e);
    return false;
  }
  return true;
}

function runBtc() {
  return new Promise(async (resolve, reject) => {
    const maxTry = 10;
    let index = 0;
    while (index < maxTry) {
      const result = await doRun();
      if (result) {
        console.log('Btc network status ready, and db updated');
        break;
      } else {
        index++;
        await sleep(3000);
      }
    }
    return Promise.resolve();
  });
}

module.exports = {
  runBtc
};
