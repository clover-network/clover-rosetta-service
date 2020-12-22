/**
 * Copyright (c) 2020 DigiByte Foundation NZ Limited
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const RosettaSDK = require('../../../..');
const Types = RosettaSDK.Client;

/* Data API: Block */

/**
* Get a Block
* Get a block by its Block Identifier. If transactions are returned in the same call to the node as fetching the block, the response should include these transactions in the Block object. If not, an array of Transaction Identifiers should be returned so /block/transaction fetches can be done to get all transaction information.
*
* blockRequest BlockRequest 
* returns BlockResponse
* */
const block = async (params) => {
  const { blockRequest } = params;
  
  if (blockRequest.block_identifier.index != 1000) {
    const previousBlockIndex = Math.max(0, blockRequest.block_identifier.index - 1);

    const blockIdentifier = new Types.BlockIdentifier(
      blockRequest.block_identifier.index,
      `block ${blockRequest.block_identifier.index}`,
    );

    const parentBlockIdentifier = new Types.BlockIdentifier(
      previousBlockIndex,
      `block ${previousBlockIndex}`,
    );

    const timestamp = Date.now() - 500000;
    const transactions = [];

    const block = new Types.Block(
      blockIdentifier,
      parentBlockIdentifier,
      timestamp,
      transactions,
    );

    return new Types.BlockResponse(block);
  }

  const previousBlockIndex = Math.max(0, blockRequest.block_identifier.index - 1);

  const blockIdentifier = new Types.BlockIdentifier(
    1000,
    'block 1000',
  );

  const parentBlockIdentifier = new Types.BlockIdentifier(
    999,
    'block 999',
  );

  const timestamp = 1586483189000;
  const transactionIdentifier = new Types.TransactionIdentifier('transaction 0');
  const operations = [
    Types.Operation.constructFromObject({
      'operation_identifier': new Types.OperationIdentifier(0),
      'type': 'Transfer',
      'status': 'Success',
      'account': new Types.AccountIdentifier('account 0'),
      'amount': new Types.Amount(
        '-1000',
        new Types.Currency('ROS', 2)
      ),
    }),

    Types.Operation.constructFromObject({
      'operation_identifier': new Types.OperationIdentifier(1),
      'related_operations': new Types.OperationIdentifier(0),
      'type': 'Transfer',
      'status': 'Reverted',
      'account': new Types.AccountIdentifier('account 1'),
      'amount': new Types.Amount(
        '1000',
        new Types.Currency('ROS', 2)
      ),
    }),
  ];

  const transactions = [
    new Types.Transaction(transactionIdentifier, operations),
  ];

  const block = new Types.Block(
    blockIdentifier,
    parentBlockIdentifier,
    timestamp,
    transactions,
  );

  const otherTransactions = [
    new Types.TransactionIdentifier('transaction 1'),
  ];

  return new Types.BlockResponse(
    block,
    otherTransactions,
  );  
};

/**
* Get a Block Transaction
* Get a transaction in a block by its Transaction Identifier. This endpoint should only be used when querying a node for a block does not return all transactions contained within it.  All transactions returned by this endpoint must be appended to any transactions returned by the /block method by consumers of this data. Fetching a transaction by hash is considered an Explorer Method (which is classified under the Future Work section).  Calling this endpoint requires reference to a BlockIdentifier because transaction parsing can change depending on which block contains the transaction. For example, in Bitcoin it is necessary to know which block contains a transaction to determine the destination of fee payments. Without specifying a block identifier, the node would have to infer which block to use (which could change during a re-org).  Implementations that require fetching previous transactions to populate the response (ex: Previous UTXOs in Bitcoin) may find it useful to run a cache within the Rosetta server in the /data directory (on a path that does not conflict with the node).
*
* blockTransactionRequest BlockTransactionRequest 
* returns BlockTransactionResponse
* */
const blockTransaction = async (params) => {
  const { blockTransactionRequest } = params;

  const transactionIdentifier = new Types.TransactionIdentifier('transaction 1');
  const operations = [
    Types.Operation.constructFromObject({
      'operation_identifier': new Types.OperationIdentifier(0),
      'type': 'Reward',
      'status': 'Success',
      'account': new Types.AccountIdentifier('account 2'),
      'amount': new Types.Amount(
        '1000',
        new Types.Currency('ROS', 2),
      ),
    }),
  ];

  return new Types.Transaction(transactionIdentifier, operations);
};

module.exports = {
  /* /block */
  block,

  /* /block/transaction */
  blockTransaction,
};
