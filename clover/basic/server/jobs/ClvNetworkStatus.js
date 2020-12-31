const { networkStatus, blockWeb3 } = require('../../chains/polkadot/service');
const _ = require('lodash');
const Status = require('../../data/models/status');
const Block = require('../../data/models/block');
const { broadcast } = require('../../socket/socket');
const { sleep } = require('../../utils/utils');
const Promise = require('bluebird');
const { Op } = require('sequelize');
const LZUTF8 = require('lzutf8');

async function doRun() {
  try {
    const status = await Status.findOne({
      where: {
        key: 'current_clv_block'
      }
    });
    const lastIndex = status.dataValues.value;
    const body = await networkStatus('Clover');
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
      // broadcast(JSON.stringify(response));
      await status.save();
    }
  } catch (e) {
    console.error(e);
    return false;
  }
  return true;
}

async function syncBlock() {
  const token = 'Clover';
  const status = await Status.findOne({
    where: {
      key: 'current_clv_block'
    },
    raw: true
  });
  let start = _.parseInt(status.value) - 10;
  start = start < 0 ? 0 : start;
  while (true) {
    try {
      const result = await blockWeb3(start);
      if (result.block) {
        const block = result.block;
        const info = {
          name: token,
          block_number: start,
          block_hash: block.block_identifier.hash,
          timestamp: block.timestamp,
          tx_count: block.transactions.length,
          used: 0
        };

        info.raw = LZUTF8.compress(JSON.stringify(result), {outputEncoding: 'StorageBinaryString'});
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

        await sleep(1000);
        start++;
      }

    } catch (e) {
      await sleep(6000);
    }
  }
}

async function runClv() {
  const maxTry = 10;
  let index = 0;
  while (index < maxTry) {
    const result = await doRun();
    if (result) {
      console.log('Clv network status ready, and db updated');
      break;
    } else {
      index++;
      await sleep(3000);
    }
  }

  await syncBlock();
}

module.exports = {
  runClv
};
