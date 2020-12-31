//not support Polkadot and Clover

const Web3 = require('web3');
const { infura_token, btc_rpc: { host, port, username, password} } = require('../../config/config');
const web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/' + infura_token));
const _ = require('lodash');
const axios = require('axios');
const BigNumber = require('bignumber.js');

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
  const result = {
    blockchain: '',
    account: {
      address: '',
      balance: '',
      contract_code: '',
      contract_transactions: []
    },
    block: {},
    transaction: {}
  };
  if (key.startsWith('0x')) {
    result.blockchain = 'Ethereum';
    if (key.length === 42) {
      result.account.address = key;
      const code = await web3.eth.getCode(key);
      if (code === '0x') {
        const balance = await web3.eth.getBalance(key);
        result.account.balance = balance;
        // await getEthTransfer(key);
      } else {
        result.account.contract_code = code;
        const history = await web3.eth.getPastLogs({fromBlock:0, address:key});
        const trans = await Promise.all(_.chain(history).reverse().take(20).map(t => web3.eth.getTransaction(t.transactionHash)).value());
        result.contract_transactions = trans;
      }
    } else {
      const transaction = await web3.eth.getTransaction(key);
      if (!transaction) {
        const block = await web3.eth.getBlock(key);
        const trans = await Promise.all(_.chain(block.transactions).map(t => web3.eth.getTransaction(t)).value());
        block.transactions = trans;
        result.block = block;
      } else {
        result.transaction = transaction;
      }
    }
  } else {
    result.blockchain = 'Bitcoin';
    if (isBtcAddress(key)) {
      result.account.balance = await btcRpc('getreceivedbyaddress', [key, 6]);
    } else if (isBtcBlock(key)) {
      result.block = await btcRpc('getblock', [key]);
    }
  }
  console.log(JSON.stringify(result));
  return result;
}

async function getEthTransfer(address) {
  const currentBlock = await web3.eth.getBlockNumber();
  let n = await web3.eth.getTransactionCount(address, currentBlock);
  const balance = await web3.eth.getBalance(address, currentBlock);
  let bal = new BigNumber(balance);
  for (let i=currentBlock; i >= 0 && (n > 0 || bal > 0); --i) {
    try {
      const block = await web3.eth.getBlock(i, true);
      if (block && block.transactions) {
        block.transactions.forEach(function(e) {
          if (address === e.from) {
            if (e.from !== e.to)
              bal = bal.plus(e.value);
            console.log(i, e.from, e.to, e.value.toString(10));
            --n;
          }
          if (address === e.to) {
            if (e.from !== e.to)
              bal = bal.minus(e.value);
            console.log(i, e.from, e.to, e.value.toString(10));
          }
        });
      }
    } catch (e) { console.error("Error in block " + i, e); }
  }
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

}

// block hash: 0x116d0bbfa611ab09e8371615afd5f1e52d1d797bd44a9c884dc6c40c1d3ca0de
// account: 0xF2b35a06DD99B4f11833f108115c2B3126D7A855
// transaction: 0xfc358e1b29674adb28562a252305129228ec03df39898ad3ec36e011dadc512b
async function searchEth() {

}

// search('0x34e74e57129c59b1dcd0739e979fc599072986d0');

module.exports = {
  search
};
