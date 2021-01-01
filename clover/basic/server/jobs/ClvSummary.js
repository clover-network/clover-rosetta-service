const _ = require('lodash');
const { broadcast } = require('../../socket/socket');
const Status = require('../../data/models/status');
const Index = require('../../data/models/index');
const { sleep } = require('../../utils/utils');
const Web3 = require('web3');
const { clover_url_http } = require('../../config/config');
const web3 = new Web3(new Web3.providers.HttpProvider(clover_url_http));

async function clvSummary() {
  let lastIndex = 0;
  const token = 'Clover';
  while(true) {
    try {
      let latest = await web3.eth.getBlockNumber();
      if (lastIndex > latest) {
        await sleep(3000);
      }
      let block = await web3.eth.getBlock(lastIndex);
      if (block.transactions.length > 0) {
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

        txCountInfo.value = parseInt(txCount) + block.transactions.length;
        await txCountInfo.save();

        const all = await Promise.all(_.map(block.transactions, id => web3.eth.getTransaction(id)));
        const contracts = _.filter(all, tx => tx.to === null);
        if (contracts.length > 0) {
          contractInfo.value = parseInt(contract) + contracts.length;
          await contractInfo.save();
        }

        const response = {
          type: 'network/summary',
          meta: {
            network_identifier: {
              blockchain: token,
              network: 'Mainnet'
            },
          },
          data: {
            total_tx: parseInt(txCount) + block.transactions.length,
            total_contract: parseInt(contract) + contracts.length
          }
        };
        broadcast(JSON.stringify(response));
        const txs = await Promise.all(_.map(block.transactions, id => web3.eth.getTransaction(id)));
        const info = {
          name: token,
          block_number: block.number,
          block_hash: block.hash,
          timestamp: block.timestamp,
          tx_count: block.transactions.length,
          used: 0,
          miner: block.miner
        };
        block.transactions = txs;
        info.raw = JSON.stringify(block);
        await Index.create(info);
      }

      await Status.update({
        value: lastIndex
      }, {
        where: {
          key: 'processed_clv_block'
        }
      });
      lastIndex++;
    } catch (e) {
      await sleep(6000);
    }
  }
}

module.exports = {
  clvSummary
};
