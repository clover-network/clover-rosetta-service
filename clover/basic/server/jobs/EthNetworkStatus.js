const { eth_rosetta_service } = require('../../config/config');
const _ = require('lodash');
const axios = require('axios');
const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Status = require('../../data/models/status');
const { getSender } = require('../../socket/socket');
const { sleep } = require('../../utils/utils');

async function doRun() {
  try {
    const networkIdentifier = new RosettaSDK.Client.NetworkIdentifier('Ethereum', 'Mainnet');
    const networkRequest = new Types.NetworkRequest.constructFromObject({
      network_identifier: networkIdentifier,
      metadata: {}
    });

    const status = await Status.findOne({
      where: {
        key: 'current_eth_block'
      }
    });
    const lastIndex = status.dataValues.value;
    const result = await axios.post(eth_rosetta_service + 'network/status', networkRequest);
    const body = result.data;
    body.peers = [];
    const index = body.current_block_identifier.index;
    if (index !== _.parseInt(lastIndex)) {
      console.log('new eth block detected, reporting with block id: ', index);
      status.value = index;
      const response = {
        type: 'network/status',
        meta: {
          network_identifier:{
            blockchain: 'Ethereum',
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

function runEth() {
  return new Promise(async (resolve, reject) => {
    const maxTry = 10;
    let index = 0;
    while (index < maxTry) {
      const result = await doRun();
      if (result) {
        console.log('Eth network status ready, and db updated');
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
  runEth
};
