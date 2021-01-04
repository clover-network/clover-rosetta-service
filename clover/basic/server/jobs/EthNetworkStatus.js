const { eth_rosetta_service, eth_rpc } = require('../../config/config');
const _ = require('lodash');
const axios = require('axios');
const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Status = require('../../data/models/status');
const Block = require('../../data/models/block');
const { broadcast } = require('../../socket/socket');
const { sleep } = require('../../utils/utils');
const Promise = require('bluebird');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const { Op } = require('sequelize');
const LZUTF8 = require('lzutf8');
const web3 = new Web3(new Web3.providers.HttpProvider(eth_rpc));

async function doRun() {
  try {
    const block = await web3.eth.getBlock('latest');
    const status = await Status.findOne({
      where: {
        key: 'current_eth_block'
      }
    });
    const lastIndex = status.dataValues.value;
    const index = block.number;
    if (index !== _.parseInt(lastIndex)) {
      console.log('new eth block detected, reporting with block id: ', index);
      status.value = index;
      await status.save();
    }
  } catch (e) {
    console.error(e);
    return false;
  }
  return true;
}

async function syncBlock() {
  const token = 'Ethereum';
  const status = await Status.findOne({
    where: {
      key: 'current_eth_block'
    },
    raw: true
  });
  let start = _.parseInt(status.value) - 10;
  start = start < 0 ? 0 : start;
  while (true) {
    try {
      const head = await web3.eth.getBlock('latest');
      if (start > head.number) {
        await sleep(3000);
        continue;
      }
      const block = await web3.eth.getBlock(start, true);
      const info = {
        name: token,
        block_number: start,
        block_hash: block.hash,
        timestamp: block.timestamp,
        tx_count: block.transactions.length,
        miner: block.miner,
        used: 0
      };

      let rewords = new BigNumber(0);
      _.each(block.transactions, (tx, idx) => {
        rewords = rewords.plus(new BigNumber(tx.gas).multipliedBy(new BigNumber(tx.gasPrice)));
      });
      info.rewords = rewords.toString();
      info.raw = LZUTF8.compress(JSON.stringify(block), {outputEncoding: 'StorageBinaryString'});
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

    } catch (e) {
      console.error(e);
      //await sleep(10000);
    }
  }
}

async function runEth() {
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
  await syncBlock();
}

module.exports = {
  runEth
};
