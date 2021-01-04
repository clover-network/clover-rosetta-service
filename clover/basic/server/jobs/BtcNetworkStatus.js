const { btc_rosetta_service, btc_rpc: { host, port, username, password} } = require('../../config/config');
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

async function btcRpc(method, param = []) {
  const time = new Date().getTime();
  const body = {
    jsonrpc: '1.0',
    id: time,
    method: method,
    params: param
  };

  const result = await axios.post(`http://${username}:${password}@${host}:${port}`, body);
  if (result.status === 200) {
    return result.data;
  }
  return '';
}

async function doRun() {
  try {
    const chaininfo = await btcRpc('getblockchaininfo');
    const status = await Status.findOne({
      where: {
        key: 'current_btc_block'
      }
    });
    const index = chaininfo.result.blocks - 1;
    const lastIndex = status.dataValues.value;
    if (index !== _.parseInt(lastIndex)) {
      console.log('new btc block detected, reporting with block id: ', index);
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
      const chaininfo = await btcRpc('getblockchaininfo');
      if (start >= chaininfo.result.blocks) {
        await sleep(30000);
      }
      const result = await btcRpc('getblockhash', [start]);
      const blockRes = await btcRpc('getblock', [result.result]);
      const block = blockRes.result;
      const coinbase = await btcRpc('getrawtransaction', [block.tx[0], true]);
      let miner = '';
      if (coinbase.result.vout && coinbase.result.vout[0].scriptPubKey) {
        miner = coinbase.result.vout[0].scriptPubKey.addresses[0];
      }
      const info = {
        name: token,
        block_number: start,
        block_hash: block.hash,
        timestamp: block.time,
        tx_count: block.tx.length,
        used: 0,
        miner: miner
      };

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

      // update difficulty
      const summary = await Summary.findOne({
        where: {
          name: token
        }
      });
      summary.difficulty = block.difficulty;
      await summary.save();
      await sleep(1000);
      start++;

    } catch (e) {
      console.error(e);
      await sleep(10000);
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
