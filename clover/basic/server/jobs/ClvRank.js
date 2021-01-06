const _ = require('lodash');
const { broadcast } = require('../../socket/socket');
const Status = require('../../data/models/status');
const Index = require('../../data/models/index');
const Rank = require('../../data/models/rank');
const { sleep } = require('../../utils/utils');
const Web3 = require('web3');
const { clover_url_http } = require('../../config/config');
const web3 = new Web3(new Web3.providers.HttpProvider(clover_url_http));
const { Op } = require('sequelize');

async function insertOrUpdate(address, balance) {
  const exist = await Rank.findOne({
    where: {
      address: address
    }
  });
  if (exist) {
    await Rank.update({
      balance: balance
    }, {
      where: {
        address: address
      }
    });
  } else {
    await Rank.create({address: address, balance: balance});
  }
}

async function clvRank() {
  let blockNum = 0;
  while(true) {
    try {
      const target = await Index.findOne({
        where: {
          block_number: {
            [Op.gt]: blockNum
          }
        },
        raw: true
      });
      if (!target) {
        await sleep(30000);
      }
      let block = await web3.eth.getBlock(target.block_number, true);
      for(const tx of block.transactions) {
        try {
          if (tx.to && tx.from !== '0x') {
            const fromBalance = await web3.eth.getBalance(tx.from);
            await insertOrUpdate(tx.from, fromBalance);
          }
          if (tx.to && tx.to !== '0x') {
            const toBalance = await web3.eth.getBalance(tx.to);
            await insertOrUpdate(tx.to, toBalance);
          }
        } catch (e) {
          console.log(e);
        }
      }

      blockNum = target.block_number + 1;
    } catch (e) {
      await sleep(30000);
    }
  }
}

module.exports = {
  clvRank
};
