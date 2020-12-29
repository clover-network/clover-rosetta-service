const { networkStatus } = require('../../chains/polkadot/service');
const _ = require('lodash');
const Status = require('../../data/models/status');
const { getSender } = require('../../socket/socket');
const { sleep } = require('../../utils/utils');

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
      // getSender() && getSender().send(JSON.stringify(response));
      await status.save();
    }
  } catch (e) {
    console.error(e);
    return false;
  }
  return true;
}

async function runClv() {
  return new Promise(async (resolve, reject) => {
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
    return Promise.resolve();
  });
}

module.exports = {
  runClv
};
