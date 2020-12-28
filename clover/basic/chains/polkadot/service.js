const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Polkadot = require("@polkadot/api");
const { polkadot_url_ws, clover_url_ws, dot_gensis, clv_gensis } = require('../../config/config');
const dotProvider = new Polkadot.WsProvider(polkadot_url_ws);
const clvProvider = new Polkadot.WsProvider(clover_url_ws);
const _ = require('lodash');
const cloverTypes =  require("./clover-types");

let DotApi = undefined;
let ClvAPi = undefined;

async function initApi(symbol) {
  if (symbol === 'Polkadot') {
    if (!DotApi) {
      DotApi = await Polkadot.ApiPromise.create({
        provider: dotProvider
      });
    }
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

const block = async (blockHashOrBlockNumber, symbol) => {
  const api = await initApi(symbol);
  let block;
  if (_.isNumber(blockHashOrBlockNumber)) {
    const hash = await api.rpc.chain.getBlockHash(blockHashOrBlockNumber);
    block = await api.rpc.chain.getBlock(hash);
  } else {
    block = await api.rpc.chain.getBlock(blockHashOrBlockNumber);
  }
  const blockIdentifier = new Types.BlockIdentifier(block.block.header.number, block.block.hash,);
  const parentBlockIdentifier = new Types.BlockIdentifier(block.block.header.number - 1, block.block.header.parentHash);
  let timestamp = 0;
  const transactions = [];
  const allEvents = await api.query.system.events.at(block.block.header.hash);
  block.block.extrinsics.forEach((ex, index) => {
    const transactionIdentifier = new Types.TransactionIdentifier(ex.hash.toHex());
    const { isSigned, meta, method: { args, method, section } } = ex;
    if (`${section}.${method}` === 'timestamp.set') {
      timestamp = args[0];
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

module.exports = {
  networkStatus,
  block,
  blockTransaction
};
