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

// syncer.test.js
const { expect, should } = require('chai');
const RosettaSDK = require('..');

const networkIdentifier = {
  blockchain: "blah",
  network:    "testnet",
};

const currency = {
  symbol:   "Blah",
  decimals: 2,
};

const recipient = {
  address: "acct1",
};

const recipientAmount = {
  value:    "100",
  currency: currency,
};

const recipientOperation = {
  operation_identifier: {
    index: 0,
  },
  type:    "Transfer",
  status:  "Success",
  account: recipient,
  amount:  recipientAmount,
};

const recipientFailureOperation = {
  operation_identifier: {
    index: 1,
  },
  type:    "Transfer",
  status:  "Failure",
  account: recipient,
  amount:  recipientAmount,
};

const recipientTransaction = {
  transaction_identifier: {
    hash: "tx1",
  },
  operations: [
    recipientOperation,
    recipientFailureOperation,
  ],
};

const sender = {
  address: "acct2",
};

const senderAmount = {
  value:    "-100",
  currency: currency,
};

const senderOperation = {
  operation_identifier: {
    index: 0,
  },
  type:    "Transfer",
  status:  "Success",
  account: sender,
  amount:  senderAmount,
};

const senderTransaction = {
  transaction_identifier: {
    hash: "tx2",
  },
  operations: [
    senderOperation,
  ],
};

const orphanGenesis = {
  block_identifier: {
    hash:  "1",
    index: 1,
  },
  parent_block_identifier: {
    hash:  "0a",
    index: 0,
  },
  transactions: [],
};

const blockSequence = [
  { // genesis
    block_identifier: {
      hash:  "0",
      index: 0,
    },
    parent_block_identifier: {
      hash:  "0",
      index: 0,
    },
  },
  {
    block_identifier: {
      hash:  "1",
      index: 1,
    },
    parent_block_identifier: {
      hash:  "0",
      index: 0,
    },
    transactions: [
      recipientTransaction,
    ],
  },
  { // reorg
    block_identifier: {
      hash:  "2",
      index: 2,
    },
    parent_block_identifier: {
      hash:  "1a",
      index: 1,
    },
  },
  {
    block_identifier: {
      hash:  "1a",
      index: 1,
    },
    parent_block_identifier: {
      hash:  "0",
      index: 0,
    },
  },
  {
    block_identifier: {
      hash:  "3",
      index: 3,
    },
    parent_block_identifier: {
      hash:  "2",
      index: 2,
    },
    transactions: [
      senderTransaction,
    ],
  },
  { // invalid block
    block_identifier: {
      hash:  "5",
      index: 5,
    },
    parent_block_identifier: {
      hash:  "4",
      index: 4,
    },
  },
];

describe('Syncer', function () {
  should();

  const syncer = new RosettaSDK.Syncer({
    networkIdentifier: networkIdentifier,
    genesisBlock: blockSequence[0].block_identifier,
    // fetcher
  });

  let lastEvent = null;

  syncer.on(RosettaSDK.Syncer.Events.BLOCK_ADDED, (block) => {
    // console.log('Block added', block);
    lastEvent = 'BLOCK_ADDED';
  });

  syncer.on(RosettaSDK.Syncer.Events.BLOCK_REMOVED, (block) => {
    // console.log('Block removed', block);
    lastEvent = 'BLOCK_REMOVED';
  });

  syncer.on(RosettaSDK.Syncer.Events.SYNC_CANCELLED, () => {
    // console.log('CANCELLED');
    lastEvent = 'CANCELLED';
  });

  it('should exist no block', async function () {
    expect(syncer.pastBlocks).to.deep.equal([]);

    await syncer.processBlock(blockSequence[0]);
    expect(lastEvent).to.equal('BLOCK_ADDED');
    expect(syncer.nextIndex).to.equal(1);
    expect(blockSequence[0].block_identifier, syncer.pastBlocks[syncer.pastBlocks.length - 1]);
    expect(syncer.pastBlocks).to.deep.equal([blockSequence[0].block_identifier]);
  });

  it('should not be able to remove the genesis block', async function () {
    const err = await syncer.processBlock(orphanGenesis).catch(e => e);
    expect(err instanceof RosettaSDK.Errors.SyncerError).to.be.true;
    expect(err.name).to.equal('SyncerError');
    expect(err.message).to.equal('Cannot remove genesis block');
  });

  it('should exist no block, no reorg should be required', async function () {
    await syncer.processBlock(blockSequence[1]);
    expect(lastEvent).to.equal('BLOCK_ADDED');
    expect(syncer.nextIndex).to.equal(2);
    expect(blockSequence[1].block_identifier, syncer.pastBlocks[syncer.pastBlocks.length - 1]);
    expect(syncer.pastBlocks).to.deep.equal([
      blockSequence[0].block_identifier,
      blockSequence[1].block_identifier,
    ]);
  });

  it('should handle orphan blocks', async function () {
    await syncer.processBlock(blockSequence[2]);
    expect(lastEvent).to.equal('BLOCK_REMOVED');
    expect(syncer.nextIndex).to.equal(1);
    expect(blockSequence[0].block_identifier, syncer.pastBlocks[syncer.pastBlocks.length - 1]);
    expect(syncer.pastBlocks).to.deep.equal([
      blockSequence[0].block_identifier,
    ]);

    await syncer.processBlock(blockSequence[3]);
    expect(lastEvent).to.equal('BLOCK_ADDED');
    expect(syncer.nextIndex).to.equal(2);
    expect(blockSequence[3].block_identifier, syncer.pastBlocks[syncer.pastBlocks.length - 1]);
    expect(syncer.pastBlocks).to.deep.equal([
      blockSequence[0].block_identifier,
      blockSequence[3].block_identifier,
    ]);    

    await syncer.processBlock(blockSequence[2]);
    expect(lastEvent).to.equal('BLOCK_ADDED');
    expect(syncer.nextIndex).to.equal(3);
    expect(blockSequence[2].block_identifier, syncer.pastBlocks[syncer.pastBlocks.length - 1]);
    expect(syncer.pastBlocks).to.deep.equal([
      blockSequence[0].block_identifier,
      blockSequence[3].block_identifier,
      blockSequence[2].block_identifier,
    ]);       
  });

  it('should handle out of order blocks', async function () {
    const error = await syncer.processBlock(blockSequence[5]).catch(e => e);
    expect(error instanceof RosettaSDK.Errors.SyncerError).to.be.true;
    expect(error.name).to.equal('SyncerError');
    expect(error.message).to.equal(`Get block 5 instead of 3`);

    expect(syncer.nextIndex).to.equal(3);
    expect(blockSequence[2].block_identifier, syncer.pastBlocks[syncer.pastBlocks.length - 1]);
    expect(syncer.pastBlocks).to.deep.equal([
      blockSequence[0].block_identifier,
      blockSequence[3].block_identifier,
      blockSequence[2].block_identifier,
    ]);    
  });
});
