const { eth_rosetta_service } = require('../../config/config');
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
      const networkRequest = {
        network_identifier:{
          blockchain: token,
          network: 'Mainnet'
        },
        block_identifier: {
          index: start
        }
      };

      const result = await axios.post(eth_rosetta_service + 'block', networkRequest);
      if (result.status === 200) {
        const block = result.data.block;
        const info = {
          name: token,
          block_number: start,
          block_hash: block.block_identifier.hash,
          timestamp: block.timestamp,
          tx_count: block.transactions.length,
          used: 0
        };
        if (block.transactions[0].operations[0].type === 'MINER_REWARD') {
          info.miner = block.transactions[0].operations[0].account.address;
        }

        let rewords = new BigNumber(0);
        _.each(block.transactions, (tx, idx) => {
          if (idx === 0 && tx.operations[0].type === 'MINER_REWARD') {
            rewords = rewords.plus(BigNumber(tx.operations[0].amount.value));
          } else if (tx.metadata && tx.metadata.receipt) {
            rewords = rewords.plus(new BigNumber(Web3.utils.hexToNumberString(tx.metadata.receipt.gasUsed)).multipliedBy(new BigNumber(Web3.utils.hexToNumberString(tx.metadata.gas_price))));
          }
          if (tx.metadata && tx.metadata.trace && tx.metadata.trace.calls) {
            tx.metadata.trace = _.omit(tx.metadata.trace, ['calls']);
          }
        });
        info.rewords = rewords.toString();
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

        await sleep(1000);
        start++;
      }

    } catch (e) {
      console.error(e);
      await sleep(10000);
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
