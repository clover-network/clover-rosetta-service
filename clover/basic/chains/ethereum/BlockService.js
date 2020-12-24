const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Web3 = require("web3");
const { infura_token } = require('../../config/config');
const web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/' + infura_token));
const _ = require('lodash');

const block = async (blockHashOrBlockNumber) => {
  const blk = await web3.eth.getBlock(blockHashOrBlockNumber);

  const blockIdentifier = new Types.BlockIdentifier(blk.number, blk.hash,);
  const parentBlockIdentifier = new Types.BlockIdentifier(blk.number - 1, blk.parentHash);
  const timestamp = blk.timestamp;
  const transactions = [];
  if (blk.transactions.length > 0) {
    const all = await Promise.all(_.map(blk.transactions, id => web3.eth.getTransaction(id)));
    const codes = await Promise.all(_.chain(all).map('from').map(addr => web3.eth.getCode(addr)).value());

    _.forEach(all, (trans, idx) => {
      const transactionIdentifier = new Types.TransactionIdentifier(trans.hash);
      const operations = [
        Types.Operation.constructFromObject({
          'operation_identifier': new Types.OperationIdentifier(0),
          'type': codes[idx] === '0x' ? 'Transfer' : 'Internal Transaction',
          'status': 'Success',
          'account': new Types.AccountIdentifier(trans.from),
          'amount': new Types.Amount(
            trans.value,
            new Types.Currency('ETH', 18)
          ),
        }),
      ];

      transactions.push(new Types.Transaction(transactionIdentifier, operations));
    });
  }

  const blockDetail = new Types.Block(
    blockIdentifier,
    parentBlockIdentifier,
    timestamp,
    transactions,
  );
  return new Types.BlockResponse(blockDetail);
};

module.exports = {
  block
};
