const { btc_rosetta_service } = require('../../config/config');
const _ = require('lodash');
const axios = require('axios');
const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Status = require('../../data/models/status');
const Summary = require('../../data/models/summary');
const Block = require('../../data/models/block');
const { broadcast } = require('../../socket/socket');
const { sleep } = require('../../utils/utils');
const Promise = require('bluebird');
const { Op } = require('sequelize');
const LZUTF8 = require('lzutf8');

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
      await status.save();
    }
  } catch (e) {
    console.error(e);
    return false;
  }
  return true;
}

async function syncBlock() {
  const token = 'Bitcoin';
  const status = await Status.findOne({
    where: {
      key: 'current_btc_block'
    },
    raw: true
  });
  let start = _.parseInt(status.value) - 10;
  start = start < 0 ? 0 : start;
  while (true) {
    try {
      const networkRequest = {
        network_identifier:{
          blockchain: token,
          network: 'Mainnet'
        },
        block_identifier: {
          index: start
        }
      };

      const result = await axios.post(btc_rosetta_service + 'block', networkRequest, {
        timeout: 10000
      });
      if (result.status === 200) {
        const block = result.data.block;
        const info = {
          name: token,
          block_number: start,
          block_hash: block.block_identifier.hash,
          timestamp: block.timestamp,
          tx_count: result.data.other_transactions.length,
          used: 0
        };

        info.raw = LZUTF8.compress(JSON.stringify(result.data), {outputEncoding: 'StorageBinaryString'});
        Block.create(info);
        Block.destroy({
          where: {
            name: token,
            block_number: {
              [Op.lt]: start - 9
            }
          }
        });

        const response = {
          type: 'network/tick',
          meta: {
            network_identifier:{
              blockchain: token,
              network: 'Mainnet'
            },
          },
          data: info
        };
        broadcast(JSON.stringify(response));

        // update difficulty
        const summary = await Summary.findOne({
          where: {
            name: token
          }
        });
        summary.difficulty = block.metadata.difficulty;
        await summary.save();
        await sleep(1000);
        start++;
      }

    } catch (e) {
      console.error(e);
      await sleep(90000);
    }
  }
}

async function runBtc() {
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

  await syncBlock();
}

module.exports = {
  runBtc
};
