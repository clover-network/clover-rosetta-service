const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Polkadot = require("@polkadot/api");
const { polkadot_url_ws, clover_url_ws, dot_gensis, clv_gensis, subscan: { block_api, metadata, blocks } } = require('../../config/config');
const dotProvider = new Polkadot.WsProvider(polkadot_url_ws);
const clvProvider = new Polkadot.WsProvider(clover_url_ws);
const _ = require('lodash');
const cloverTypes =  require("./clover-types");
const axios = require('axios');
const { broadcast } = require('../../socket/socket');

const Web3 = require('web3');
const { clover_url_http } = require('../../config/config');
const web3 = new Web3(new Web3.providers.HttpProvider(clover_url_http));
let DotApi = undefined;
let ClvAPi = undefined;

async function initApi(symbol) {
  if (symbol === 'Polkadot') {
    // if (!DotApi) {
      DotApi = await Polkadot.ApiPromise.create({
        provider: dotProvider
      });
    // }
    return Promise.resolve(DotApi);
  } else {
    if (!ClvAPi) {
      ClvAPi = await Polkadot.ApiPromise.create({
        provider: clvProvider,
        types: cloverTypes,
      });
    }
    return Promise.resolve(ClvAPi);
  }
}

const networkStatus = async (symbol) => {
  /**if (symbol === 'Polkadot') {
    const result = await axios.post(blocks, {
      "row": 1,
      "page": 0
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    }, {
      timeout: 6000
    });
    if (result.status === 200 && result.data.data) {
      const block = result.data.data.blocks[0];
      const currentBlockIdentifier = new Types.BlockIdentifier(block.block_num, block.hash);
      const currentBlockTimestamp = block.block_timestamp;
      const genesisBlockIdentifier = new Types.BlockIdentifier(0, symbol === 'dot' ? dot_gensis : clv_gensis);
      const peers = [
        new Types.Peer(''),
      ];

      return new Types.NetworkStatusResponse(
        currentBlockIdentifier,
        currentBlockTimestamp,
        genesisBlockIdentifier,
        peers,
      );
    }
    return;
  }**/
  const api = await initApi(symbol);
  const block = await api.rpc.chain.getBlock();
  const currentBlockIdentifier = new Types.BlockIdentifier(block.block.header.number.toString(), block.block.header.hash.toHex());
  const currentBlockTimestamp = parseInt(block.block.extrinsics[0].method.args.toString());
  const genesisBlockIdentifier = new Types.BlockIdentifier(0, symbol === 'dot' ? dot_gensis : clv_gensis);
  const peers = [
    new Types.Peer(''),
  ];

  return new Types.NetworkStatusResponse(
    currentBlockIdentifier,
    currentBlockTimestamp,
    genesisBlockIdentifier,
    peers,
  );
};

const networkStatusSubscan = async () => {
  const result = await axios.post(metadata, {}, {
    headers: {
      "Content-Type": "application/json"
    }
  }, {
    timeout: 6000
  });
  if (result.status === 200) {
    return result.data.data;
  }
};

const block = async (blockHashOrBlockNumber, symbol) => {
  const api = await initApi(symbol);
  let block;
  if (_.isNumber(blockHashOrBlockNumber)) {
    const hash = await api.rpc.chain.getBlockHash(blockHashOrBlockNumber);
    block = await api.rpc.chain.getBlock(hash);
  } else {
    block = await api.rpc.chain.getBlock(blockHashOrBlockNumber);
  }
  const blockIdentifier = new Types.BlockIdentifier(block.block.header.number, block.block.hash.toString());
  const parentBlockIdentifier = new Types.BlockIdentifier(block.block.header.number - 1, block.block.header.parentHash.toString());
  let timestamp = '0';
  const transactions = [];
  const allEvents = await api.query.system.events.at(block.block.header.hash);
  block.block.extrinsics.forEach((ex, index) => {
    const transactionIdentifier = new Types.TransactionIdentifier(ex.hash.toHex().toString());
    const { isSigned, meta, method: { args, method, section } } = ex;
    if (`${section}.${method}` === 'timestamp.set') {
      timestamp = args[0].toString();
    }
    if (isSigned) {
      const events = allEvents.filter(({ phase }) =>
        phase.isApplyExtrinsic &&
        phase.asApplyExtrinsic.eq(index)
      );
      let amount = 0;
      if (`${section}.${method}` === 'balances.transfer') {
        amount = args[1];
      }
      const operations = [
        Types.Operation.constructFromObject({
          'operation_identifier': new Types.OperationIdentifier(0),
          'type': `${section}.${method}`,
          'status': 'Success',
          'account': new Types.AccountIdentifier(ex.signer.toString()),
          'amount': new Types.Amount(
            amount,
            new Types.Currency(symbol === 'Polkadot' ? 'DOT' : 'CLV', symbol === 'Polkadot' ? 10 : 12)
          ),
        }),
      ];
      transactions.push(new Types.Transaction(transactionIdentifier, operations));
    }
  });

  const blockDetail = new Types.Block(
    blockIdentifier,
    parentBlockIdentifier,
    timestamp,
    transactions,
  );
  return new Types.BlockResponse(blockDetail);
};


const blockTransaction = async (blockHashOrBlockNumber, transactionHash, symbol) => {
  const api = await initApi(symbol);
  let block;
  if (_.isNumber(blockHashOrBlockNumber)) {
    const hash = await api.rpc.chain.getBlockHash(blockHashOrBlockNumber);
    block = await api.rpc.chain.getBlock(hash);
  } else {
    block = await api.rpc.chain.getBlock(blockHashOrBlockNumber);
  }
  let timestamp = 0;
  let transaction = {};

  block.block.extrinsics.forEach((ex, index) => {
    const transactionIdentifier = new Types.TransactionIdentifier(ex.hash.toHex());
    const { method: { args, method, section } } = ex;
    if (`${section}.${method}` === 'timestamp.set') {
      timestamp = args[0];
    }
    if (ex.hash.toHex() === transactionHash) {
      let amount = 0;
      if (`${section}.${method}` === 'balances.transfer') {
        amount = args[1];
      }
      const operations = [
        Types.Operation.constructFromObject({
          'operation_identifier': new Types.OperationIdentifier(0),
          'type': `${section}.${method}`,
          'status': 'Success',
          'account': new Types.AccountIdentifier(ex.signer.toString()),
          'amount': new Types.Amount(
            amount,
            new Types.Currency(symbol === 'Polkadot' ? 'DOT' : 'CLV', symbol === 'Polkadot' ? 10 : 12)
          ),
        }),
      ];
      transaction = new Types.Transaction(transactionIdentifier, operations);
    }
  });
  return transaction;
};

//blockTransaction('0x78ae6828eb6f994f8f41383d614ae7fdaa6bbff8e2b5ebdd3cf593db1a5bd5cd', '0x26a1ed38ecbd837b0a303036b3c8d7994f5cc90e42988e17aff9f3700b878239', 'Polkadot').then((res) => {
//   console.log(JSON.stringify(res));
//});

const blockSubscan = async (blockId) => {
  const data = _.isNumber(blockId) ? {
    block_num: blockId
  } : {
    block_hash: blockId
  };
  const meta = await networkStatusSubscan();
  if (_.isNumber(blockId) && blockId > meta.blockNum) {
    return;
  }
  const result = await querySubscan(data);
  if (result.code === 0 && result.data) {

    const response = {
      type: 'network/summary',
      meta: {
        network_identifier: {
          blockchain: 'Polkadot',
          network: 'Mainnet'
        },
      },
      data: meta
    };
    broadcast(JSON.stringify(response));

    const blk = result.data;
    const blockIdentifier = new Types.BlockIdentifier(blk.block_num, blk.hash,);
    const parentBlockIdentifier = new Types.BlockIdentifier(blk.block_num - 1, blk.parent_hash);
    const timestamp = blk.block_timestamp;
    const transactions = [];
    _.forEach(blk.extrinsics, (ex, idx) => {
      if (!ex.extrinsic_hash) {
        return;
      }
      const transactionIdentifier = new Types.TransactionIdentifier(ex.extrinsic_hash);
      let amount = 0;
      let to = '';
      if (ex.call_module_function === 'transfer' && ex.call_module === 'balances') {
        const params = JSON.parse(ex.params);
        to = _.find(params, p => p.name === 'dest').value;
        amount = _.find(params, p => p.name === 'value').value;
      }
      const operations = [
        Types.Operation.constructFromObject({
          'operation_identifier': new Types.OperationIdentifier(0),
          'type': ex.call_module_function.toUpperCase(),
          'status': ex.finalized ? 'SUCCESS' : 'FAILED',
          'account': new Types.AccountIdentifier(ex.account_id),
          'amount': new Types.Amount(
            amount,
            new Types.Currency('DOT', 10)
          ),
        }),
      ];

      const transaction = new Types.Transaction(transactionIdentifier, operations);
      transaction.metadata = {
        gas_limit: ex.fee,
        gas_price: 1,
        receipt: {
          blockHash: blk.hash,
          blockNumber: blk.block_num,
          gasUsed: ex.fee,
          status: ex.finalized,
          transactionHash: ex.extrinsic_hash,
          transactionIndex: ex.extrinsic_index
        }
      };
      transaction.trace = {
        from: ex.account_id,
        gas: 1,
        gasUsed: ex.fee,
        input: ex.params,
        to: to,
        type: ex.call_module_function.toUpperCase(),
        value: amount
      };
      transactions.push(transaction);
    });

    const blockDetail = new Types.Block(
      blockIdentifier,
      parentBlockIdentifier,
      timestamp,
      transactions,
    );
    blockDetail.miner = blk.validator;
    return new Types.BlockResponse(blockDetail);
  }
};

const querySubscan = async (data) => {
  const result = await axios.post(block_api, data, {
    headers: {
      "Content-Type": "application/json"
    }
  }, {
    timeout: 6000
  });
  if (result.status === 200) {
    return result.data;
  }
};

// blockSubscan(1665108);

const blockWeb3 = async (blockHashOrBlockNumber) => {
  if (_.isNumber(blockHashOrBlockNumber)) {
    const latest = await web3.eth.getBlockNumber();
    if (blockHashOrBlockNumber > latest) {
      return;
    }
  }

  const blk = await web3.eth.getBlock(blockHashOrBlockNumber);

  const blockIdentifier = new Types.BlockIdentifier(blk.number, blk.hash,);
  const parentBlockIdentifier = new Types.BlockIdentifier(blk.number - 1, blk.parentHash);
  const timestamp = blk.timestamp;
  const transactions = [];
  if (blk.transactions.length > 0) {
    const all = await Promise.all(_.map(blk.transactions, id => web3.eth.getTransaction(id)));
    const receipts = await Promise.all(_.map(blk.transactions, id => web3.eth.getTransactionReceipt(id)));

    _.forEach(all, (trans, idx) => {
      const transactionIdentifier = new Types.TransactionIdentifier(trans.hash);
      const operations = [
        Types.Operation.constructFromObject({
          'operation_identifier': new Types.OperationIdentifier(0),
          'type': 'FEE',
          'status': 'SUCCESS',
          'account': new Types.AccountIdentifier(trans.from),
          'amount': new Types.Amount(
            trans.value,
            new Types.Currency('ETH', 18)
          ),
        }),
      ];

      const transaction = new Types.Transaction(transactionIdentifier, operations);
      transaction.metadata = {
        gas_limit: trans.gas,
        gas_price: trans.gasPrice,
        receipt: {
          blockHash: trans.blockHash,
          blockNumber: trans.blockNumber,
          cumulativeGasUsed: receipts[idx].cumulativeGasUsed,
          gasUsed: receipts[idx].gasUsed,
          logs: receipts[idx].logs,
          logsBloom: receipts[idx].logsBloom,
          status: receipts[idx].status,
          transactionHash: receipts[idx].transactionHash,
          transactionIndex: receipts[idx].transactionIndex
        }
      };
      transaction.trace = {
        from: receipts[idx].from,
        gas: trans.gas,
        gasUsed: receipts[idx].gasUsed,
        input: trans.input,
        to: receipts[idx].to,
        type: 'FEE',
        value: trans.value
      };
      transactions.push(transaction);
    });
  }

  const blockDetail = new Types.Block(
    blockIdentifier,
    parentBlockIdentifier,
    timestamp,
    transactions,
  );
  blockDetail.miner = blk.miner;
  return new Types.BlockResponse(blockDetail);
};

module.exports = {
  networkStatus,
  networkStatusSubscan,
  block,
  blockTransaction,
  blockWeb3,
  blockSubscan
};
