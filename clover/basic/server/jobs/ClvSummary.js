const _ = require('lodash');
const { getSender } = require('../../socket/socket');
const Status = require('../../data/models/status');
const { sleep } = require('../../utils/utils');
const Web3 = require('web3');
const { clover_url_http } = require('../../config/config');
const web3 = new Web3(new Web3.providers.HttpProvider(clover_url_http));

async function clvSummary() {
  let lastIndex = 0;
  while(true) {
    try {
      let block = await web3.eth.getBlock(lastIndex);
      if (block.transactions.length > 0) {
        const blockInfo = await Status.findOne({
          where: {
            key: 'processed_clv_block'
          }
        });
        let lastIndex = blockInfo.dataValues.value;

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

        const all = await Promise.all(_.map(block.transactions, id => web3.eth.getTransaction(id)));
        blockInfo.value = lastIndex;
        await blockInfo.save();

        txCountInfo.value = parseInt(txCount) + block.transactions.length;
        await txCountInfo.save();

        const contracts = _.filter(all, tx => tx.to === null);
        if (contracts.length > 0) {
          contractInfo.value = parseInt(contract) + contracts.length;
          await contractInfo.save();
        }

        const response = {
          type: 'network/summary',
          meta: {
            network_identifier: {
              blockchain: 'Clover',
              network: 'Mainnet'
            },
          },
          data: {
            total_tx: parseInt(txCount) + block.transactions.length,
            total_contract: parseInt(contract) + contracts.length
          }
        };
        getSender() && getSender().send(JSON.stringify(response));
      }

      lastIndex++;
    } catch (e) {
      console.log(e);
      await sleep(6000);
    }
  }
}

module.exports = {
  clvSummary
};
