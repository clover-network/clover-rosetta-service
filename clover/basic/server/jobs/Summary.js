const _ = require('lodash');
const axios = require('axios');
const Summary = require('../../data/models/summary');
const { getSender } = require('../../socket/socket');

async function run() {
  const token = new Date().getTime() % 2 === 0 ? 'Bitcoin' : 'Ethereum';
  console.log(`retrieving ${token} info...`);
  const result = await axios.get('http://www.tokenview.com:8088/coin/marketInfo/' + (token === 'Bitcoin' ? 'btc' : 'eth'));
  const summary = await Summary.findOne({
    where: {
      name: token
    }
  });
  if (result.status === 200) {
    summary.price_change_24h = result.data.data.changeUsd24h;
    summary.price = result.data.data.priceUsd;
    summary.market = result.data.data.marketCapUsd;
    await summary.save();
  }
  const all = await Summary.findOne({
    where: {
      name: token
    },
    raw: true
  });
  const response = {
    type: 'network/summary',
    meta: {
      network_identifier: {
        blockchain: token,
        network: 'Mainnet'
      },
    },
    data: all
  };
  getSender() && getSender().send(JSON.stringify(response));
}

module.exports = {
  run
};
