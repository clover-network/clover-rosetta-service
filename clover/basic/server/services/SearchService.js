//not support Polkadot and Clover

const Web3 = require('web3');
const { clover_url_http, infura_token, btc_rpc: { host, port, username, password}, subscan: {search_api} } = require('../../config/config');
const web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/' + infura_token));
const _ = require('lodash');
const axios = require('axios');
const BigNumber = require('bignumber.js');
const Index = require('../../data/models/index');
const web3Clv = new Web3(new Web3.providers.HttpProvider(clover_url_http));

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

async function search(key) {
  const results = await Promise.all([searchBtc(key), searchEth(key), searchPolkadot(key), searchClv(key)]);
  const result = _.filter(results, r => !!r);
  console.log(JSON.stringify(result));
  return result;
}

async function getEthTransfer(address) {
  const currentBlock = await web3.eth.getBlockNumber();
  let n = await web3.eth.getTransactionCount(address, currentBlock);
  const transactions = [];
  for (let i=currentBlock; i >= currentBlock - 10 && n > 0; --i) {
    const block = await web3.eth.getBlock(i, true);
    if (block && block.transactions) {
      block.transactions.forEach(e => {
        if (e.from === address || e.to === e.from) {
          transactions.push({
            block: block.number,
            from: e.from,
            to: e.to,
            value: e.value
          });
        }
      });
    }
  }
  return transactions;
}

function isBtcAddress(key) {
  return key.length <= 34;
}

function isBtcBlock(key) {
  return key.startsWith('0000000000');
}

// block hash: 000000000000000004ec466ce4732fe6f1ed1cddc2ed4b328fff5224276e3f6f
// account: 1BQLNJtMDKmMZ4PyqVFfRuBNvoGhjigBKF
// transaction: fc12dfcb4723715a456c6984e298e00c479706067da81be969e8085544b0ba08
async function searchBtc(key) {
  if (key.startsWith('0x')) {
    return;
  }
  try {
    const result = {
      blockchain: '',
      block: {},
      transaction: {}
    };
    result.blockchain = 'Bitcoin';
    if (isBtcAddress(key)) {
      // result.account.balance = await btcRpc('getreceivedbyaddress', [key, 6]);
    } else if (isBtcBlock(key)) {
      const block = await btcRpc('getblock', [key]);
      if (!block) {
        return;
      }
      result.block = block;
      return result;
    } else {
      const transaction = await btcRpc('getrawtransaction', [key, true]);
      if (!transaction) {
        return;
      }
      result.transaction = transaction;
      return result;
    }
  } catch (e) {}
}

// block hash: 0x116d0bbfa611ab09e8371615afd5f1e52d1d797bd44a9c884dc6c40c1d3ca0de
// account: 0xF2b35a06DD99B4f11833f108115c2B3126D7A855
// transaction: 0xfc358e1b29674adb28562a252305129228ec03df39898ad3ec36e011dadc512b
async function searchEth(key) {
  const result = {
    blockchain: '',
    account: {
      address: '',
      balance: '',
      contract_code: '',
      contract_transactions: [],
      transactions: []
    },
    block: {},
    transaction: {}
  };
  try {
    if (key.startsWith('0x')) {
      result.blockchain = 'Ethereum';
      if (key.length === 42) {
        result.account.address = key;
        const code = await web3.eth.getCode(key);
        if (code === '0x') {
          const balance = await web3.eth.getBalance(key);
          result.account.balance = balance;
          return result;
        } else {
          result.account.contract_code = code;
          const history = await web3.eth.getPastLogs({fromBlock:0, address:key});
          const trans = await Promise.all(_.chain(history).reverse().take(20).map(t => web3.eth.getTransaction(t.transactionHash)).value());
          result.account.contract_transactions = trans;
          return result;
        }
      } else {
        const transaction = await web3.eth.getTransaction(key);
        if (!transaction) {
          const block = await web3.eth.getBlock(key);
          if (!block) {
            return;
          }
          const trans = await Promise.all(_.chain(block.transactions).map(t => web3.eth.getTransaction(t)).value());
          block.transactions = trans;
          result.block = block;
          return result;
        } else {
          result.transaction = transaction;
          return result;
        }
      }
    }
  } catch (e) {}
}

async function searchPolkadot(key) {
  try {
    const response = await axios.post(search_api, {
      key: key,
      row: 20,
      page: 1
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (response.status === 200 && response.data.data) {
      return {
        blockchain: 'Polkadot',
        ...response.data.data
      };
    }
  } catch (e) {
  }
}


async function searchClv(key) {
  const result = {
    blockchain: '',
    account: {
      address: '',
      balance: '',
      contract_code: '',
      contract_transactions: [],
      transactions: []
    },
    block: {},
    transaction: {}
  };
  try {
    if (key.startsWith('0x')) {
      //const res = await Index.findAll({
      //  raw: true
      //});
      const web3 = web3Clv;
      result.blockchain = 'Clover';
      if (key.length === 42) {
        result.account.address = key;
        const code = await web3.eth.getCode(key);
        if (code === '0x') {
          const balance = await web3.eth.getBalance(key);
          result.account.balance = balance;
          return result;
        } else {
          result.account.contract_code = code;
          const history = await web3.eth.getPastLogs({fromBlock:0, address:key});
          const trans = await Promise.all(_.chain(history).reverse().take(20).map(t => web3.eth.getTransaction(t.transactionHash)).value());
          result.account.contract_transactions = trans;
          return result;
        }
      } else {
        const transaction = await web3.eth.getTransaction(key);
        if (!transaction) {
          const block = await web3.eth.getBlock(key);
          if (!block) {
            return;
          }
          const trans = await Promise.all(_.chain(block.transactions).map(t => web3.eth.getTransaction(t)).value());
          block.transactions = trans;
          result.block = block;
          return result;
        } else {
          result.transaction = transaction;
          return result;
        }
      }
    }

  } catch (e) {
  }
}

//search('022f239cc102e3830c8198fc11c3d411619b5bd7d8262b7316cf3f16827d1d20');

module.exports = {
  search
};
