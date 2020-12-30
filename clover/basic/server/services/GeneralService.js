const { eth_rosetta_service, btc_rosetta_service } = require('../../config/config');
const { networkStatus, block, blockTransaction } = require('../../chains/polkadot/service');
const Summary = require('../../data/models/summary');
const Block = require('../../data/models/block');
const Status = require('../../data/models/status');
const _ = require('lodash');
const axios = require('axios');

const generalService = async (params, msg) => {
  const payload = params[params.requestParamsKey];
  if (payload.network_identifier && msg.url === '/network/summary') {
    const chain = payload.network_identifier.blockchain;
    if (chain === 'Clover') {
      const txCountInfo = await Status.findOne({
        where: {
          key: 'clv_tx_count'
        }
      });
      let txCount = txCountInfo.dataValues.value;

      const contractInfo = await Status.findOne({
        where: {
          key: 'clv_contract_count'
        }
      });
      let contract = contractInfo.dataValues.value;
      return {
        total_tx: txCount,
        total_contract: contract
      }
    } else {
      return await Summary.findOne({
        where: {
          name: payload.network_identifier.blockchain
        },
        raw: true
      });
    }
  }
  if (payload.network_identifier && msg.url === '/network/tick') {
    return await Block.findAll({
      where: {
        name: payload.network_identifier.blockchain
      },
      order: [
        ['id', 'DESC'],
      ],
      raw: true
    });
  }
  if (payload.network_identifier && payload.network_identifier.blockchain === 'Ethereum') {
    let result = await axios.post(eth_rosetta_service + msg.url, payload);
    return result.data;
  } else if (payload.network_identifier && payload.network_identifier.blockchain === 'Bitcoin') {
    let result = await axios.post(btc_rosetta_service + msg.url, payload);
    return result.data;
  } else if (payload.network_identifier) {
    if (msg.url === '/network/status') {
      return await networkStatus(payload.network_identifier.blockchain);
    }
    if (msg.url === '/block') {
      return await block(payload.block_identifier.hash ? payload.block_identifier.hash : payload.block_identifier.index,
        payload.network_identifier.blockchain);
    }
    if (msg.url === '/block/transaction') {
      return await blockTransaction(payload.block_identifier.hash ? payload.block_identifier.hash : payload.block_identifier.index,
        payload.transaction_identifier.hash, payload.network_identifier.blockchain);
    }
  }
};

module.exports = {
  generalService,
};
