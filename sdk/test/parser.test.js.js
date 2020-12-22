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

// parser.test.js
const { expect } = require('chai');
const RosettaSDK = require('..');

const { Hash } = RosettaSDK.Utils;
const {
  Descriptions,
  OperationDescription,
  AccountDescription,
  AmountDescription,
  Sign,
} = RosettaSDK.InternalModels;

const currency = { /* Currency */
  symbol:   "Blah",
  decimals: 2,
};

const recipient = { /* AccountIdentifier */
  address: "acct1",
};

const recipientAmount = { /* Amount */
  value:    "100",
  currency: currency,
};

const emptyAccountAndAmount = { /* Operation */
  operation_identifier: {
    index: 0,
  },
  type:   "Transfer",
  status: "Success",
};

const emptyAmount = { /* Operation */
  operation_identifier: {
    index: 0,
  },
  type:    "Transfer",
  status:  "Success",
  account: recipient,
};

const recipientOperation = { /* Operation */
  operation_identifier: {
    index: 0,
  },
  type:    "Transfer",
  status:  "Success",
  account: recipient,
  amount:  recipientAmount,
};

const recipientFailureOperation = { /* Operation */
  operation_identifier: {
    index: 1,
  },
  type:    "Transfer",
  status:  "Failure",
  account: recipient,
  amount:  recipientAmount,
};

const recipientTransaction = { /* Transaction */
  transaction_identifier: {
    hash: "tx1",
  },
  operations: [
    emptyAccountAndAmount,
    emptyAmount,
    recipientOperation,
    recipientFailureOperation,
  ],
};

const defaultStatus = [ /* OperationStatus */
  {
    status:     "Success",
    successful: true,
  }, {
    status:     "Failure",
    successful: false,
  },
];

const c = (arg) => arg == undefined ? arg : JSON.parse(JSON.stringify(arg));

const createTransaction = (hash, address, value, currency) => {
  return { /* Transaction */
    transaction_identifier: {
      hash: hash,
    },

    operations: [{ /* [Operation] */
      operation_identifier: {
        index: 0,
      },

      type: 'Transfer',

      status: 'Success',

      account: {
        address: address,
      },

      amount: {
        value: value,
        currency: currency,
      },
    }],
  };
};

const createAsserter = (allowedStatuses) => {
  const asserter = new RosettaSDK.Asserter({
    networkIdentifier: {
      blockchain: 'bitcoin',
      network: 'mainnet',
    },

    genesisBlock: {
      hash: 'block 0',
      index: 0,
    },

    operationTypes: ['Transfer'],

    operationStatuses: allowedStatuses,

    errorTypes: [],
  });

  return asserter;
};

describe('Parser', function () {
  describe('Test Balance Changes', function () {
    it('should be able to parse a block', async function () {
      const asserter = createAsserter(defaultStatus);

      const parser = new RosettaSDK.Parser({
        asserter,
      });

      const block = {
        block_identifier: {
          hash: '1',
          index: 1,
        },

        parent_block_identifier: {
          hash: '0',
          index: 0,
        },

        transactions: [
          recipientTransaction,
        ],

        timestamp: asserter.minUnixEpoch + 1,
      };

      const expectedChanges = [
        {
          account_identifier: recipient,
          currency: currency,
          block_identifier: {
            hash: '1',
            index: 1,
          },
          difference: '100',
        },
      ];

      const isOrphan = false;

      const changes = parser.balanceChanges(block, isOrphan);
      expect(changes).to.deep.equal(expectedChanges);
    });

    it('should work with an excempt function', async function () {
      const asserter = createAsserter(defaultStatus);

      const parser = new RosettaSDK.Parser({
        asserter,
        exemptFunc: (op) => 
          Hash(op.account) == Hash(recipientOperation.account),      
      });

      const block = {
        block_identifier: {
          hash: '1',
          index: 1,
        },

        parent_block_identifier: {
          hash: '0',
          index: 0,
        },

        transactions: [
          recipientTransaction,
        ],

        timestamp: asserter.minUnixEpoch + 1,
      };

      const expectedChanges = [];
      const isOrphan = false;

      const changes = parser.balanceChanges(block, isOrphan);
      expect(changes).to.deep.equal(expectedChanges);    
    });

    it('should group balanceChanges if an address receives multiple utxos', async function () {
      const asserter = createAsserter(defaultStatus);

      const parser = new RosettaSDK.Parser({
        asserter,
      });

      const block = {
        block_identifier: {
          hash: '1',
          index: 1,
        },

        parent_block_identifier: {
          hash: '0',
          index: 0,
        },

        transactions: [
          createTransaction('tx1', 'addr1', '100', currency),
          createTransaction('tx2', 'addr1', '150', currency),
          createTransaction('tx3', 'addr2', '150', currency),
        ],

        timestamp: asserter.minUnixEpoch + 1,
      };

      const expectedChanges = [
        {
          account_identifier: { address: 'addr1' },
          currency: currency,
          block_identifier: {
            hash: '1',
            index: 1,
          },
          difference: '250',
        },

        {
          account_identifier: { address: 'addr2' },
          currency: currency,
          block_identifier: {
            hash: '1',
            index: 1,
          },
          difference: '150',
        },
      ];

      const isOrphan = false;

      const changes = parser.balanceChanges(block, isOrphan);
      expect(changes).to.deep.equal(expectedChanges);
    });

    it('should reduce balance again if an orphan block appears', async function () {
      const asserter = createAsserter(defaultStatus);

      const parser = new RosettaSDK.Parser({
        asserter,
      });

      const block = {
        block_identifier: {
          hash: '1',
          index: 1,
        },

        parent_block_identifier: {
          hash: '0',
          index: 0,
        },

        transactions: [
          createTransaction('tx1', 'addr1', '100', currency),
          createTransaction('tx2', 'addr1', '150', currency),
          createTransaction('tx3', 'addr2', '150', currency),
        ],

        timestamp: asserter.minUnixEpoch + 1,
      };

      const expectedChanges = [
        {
          account_identifier: { address: 'addr1' },
          currency: currency,
          block_identifier: {
            hash: '0',
            index: 0,
          },
          difference: '-250',
        },

        {
          account_identifier: { address: 'addr2' },
          currency: currency,
          block_identifier: {
            hash: '0',
            index: 0,
          },
          difference: '-150',
        },
      ];

      const isOrphan = true;

      const changes = parser.balanceChanges(block, isOrphan);
      expect(changes).to.deep.equal(expectedChanges);
    });
  });

  describe('Test Sort Operations', function () {
    it('should sort operations correctly', function () {
      const operationsMap = {
        2: {
          operations: [
            { operation_identifier: { index: 2 } },
          ],
        },

        4: {
          operations: [
            { operation_identifier: { index: 4 } },
          ],
        },

        0: {
          operations: [
            { operation_identifier: { index: 1 }, related_operations: [{ index: 0 }] },
            { operation_identifier: { index: 3 }, related_operations: [{ index: 1 }] },
            { operation_identifier: { index: 0 } },
          ],
        },

        5: {
          operations: [
            { operation_identifier: { index: 5 } },
          ],
        },      
      };

      const parser = new RosettaSDK.Parser();

      const expectedResult = [
        {
          operations: [
            { operation_identifier: { index: 0 } },
            { operation_identifier: { index: 1 }, related_operations: [{ index: 0 }] },
            { operation_identifier: { index: 3 }, related_operations: [{ index: 1 }] },
          ],
        },

        {
          operations: [
            { operation_identifier: { index: 2 } },
          ],
        },

        {
          operations: [
            { operation_identifier: { index: 4 } },
          ],
        },

        {
          operations: [
            { operation_identifier: { index: 5 } },
          ],
        },        
      ];

      const result = parser.sortOperationsGroup(6, operationsMap);

      expect(result).to.deep.equal(expectedResult);
    });
  });

  describe('Test Group Operations', function () {
    it('should return nothing if there is no transaction', async function () {
      const parser = new RosettaSDK.Parser();
      const transaction = new RosettaSDK.Client.Transaction();
      const result = parser.groupOperations(transaction);

      expect(result).to.deep.equal([]);
    });

    it('should not group unrelated operations', async function () {
      const parser = new RosettaSDK.Parser();
      const transaction = {
        operations: [
          {
            operation_identifier: { index: 0 },
            type: 'op 0',
            amount: {
              currency: { symbol: 'BTC' },
            },
          },

          {
            operation_identifier: { index: 1 },
            type: 'op 1',
          },

          {
            operation_identifier: { index: 2 },
            type: 'op 2',
          },          
        ],
      };

      const expectedResult = [
        {
          type: 'op 0',
          operations: [
            {
              operation_identifier: { index: 0 },
              type: 'op 0',
              amount: {
                currency: { symbol: 'BTC', },
              },
            },
          ],

          nil_amount_present: false,
          currencies: [
            { symbol: 'BTC' }
          ],
        },

        {
          type: 'op 1',
          operations: [
            {
              operation_identifier: { index: 1 },
              type: 'op 1',
            },
          ],

          nil_amount_present: true,
          currencies: [],
        },

        {
          type: 'op 2',
          operations: [
            {
              operation_identifier: { index: 2 },
              type: 'op 2',
            },
          ],

          nil_amount_present: true,
          currencies: [],
        },        
      ];      

      const result = parser.groupOperations(transaction);

      expect(c(result)).to.deep.equal(expectedResult);      
    });

    it('should group related operations', async function () {
      const parser = new RosettaSDK.Parser();
      const transaction = {
        operations: [
          {
            operation_identifier: { index: 0 },
            type: 'type 0',
            amount: {
              currency: { symbol: 'BTC' },
            },
          },

          {
            operation_identifier: { index: 1 },
            type: 'type 1',
          },

          {
            operation_identifier: { index: 2 },
            type: 'type 2',
            amount: {
              currency: { symbol: 'BTC' },
            }
          },

          {
            operation_identifier: { index: 3 },
            related_operations: [
              { index: 2 },
            ],
            type: 'type 2',
            amount: {
              currency: { symbol: 'ETH' },
            }
          },

          {
            operation_identifier: { index: 4 },
            related_operations: [{ index: 2 }],
            type: 'type 4',
          },

          {
            operation_identifier: { index: 5 },
            related_operations: [{ index: 0 }],
            type: 'type 0',
            amount: {
              currency: { symbol: 'BTC' },
            },
          },
        ],
      };

      const expectedResult = [
        {
          type: 'type 0',
          nil_amount_present: false,
          operations: [
            {
              operation_identifier: { index: 0 },
              type: 'type 0',
              amount: {
                currency: { symbol: 'BTC' },
              }
            },

            {
              operation_identifier: { index: 5 },
              related_operations: [
                { index: 0 },
              ],
              type: 'type 0',
              amount: {
                currency: { symbol: 'BTC' },
              }
            },       
          ],

          currencies: [
            { symbol: 'BTC' },
          ],
        },

        {
          type: 'type 1',
          nil_amount_present: true,
          operations: [
            {
              operation_identifier: { index: 1 },
              type: 'type 1',
            },   
          ],

          currencies: [],
        },   

        {
          type: '',
          nil_amount_present: true,
          currencies: [
            { symbol: 'BTC' },
            { symbol: 'ETH' },
          ],
          operations: [
            {
              operation_identifier: { index: 2 },
              type: 'type 2',
              amount: {
                currency: { symbol: 'BTC' },
              }
            },

            {
              operation_identifier: { index: 3 },
              related_operations: [
                { index: 2 },
              ],
              type: 'type 2',
              amount: {
                currency: { symbol: 'ETH' },
              }
            },

            {
              operation_identifier: { index: 4 },
              related_operations: [
                { index: 2 },
              ],
              type: 'type 4',
            },        
          ],
        },     
      ];

      const result = parser.groupOperations(transaction);
      expect(c(result)).to.deep.equal(expectedResult);
    });
  });

  describe('Test Match Operations', function () {
    it('should detect a simple transfer (with extra empty op)', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        opposite_amounts: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive
            }),
          }),            
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: { value: '100' },
        },

        {}, // should be ignored

        {
          account: { address: 'addr1' },
          amount: { value: '-100' },
        },
      ];

      const expectedMatches = [
        {
          operations: [{
            account: { address: 'addr1' },
            amount: { value: '-100' },
          }],

          amounts: [-100]
        },

        {
          operations: [{
            account: { address: 'addr2' },
            amount: { value: '100' },
          }],

          amounts: [100],
        }        
      ];

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        console.error(e);
      }

      expect(c(matches)).to.deep.equal(expectedMatches);
    });

    it('should throw an error when parsing a simple transfer without an account', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        opposite_amounts: [[0, 1]],
        equal_addresses: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({ exists: false }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive
            }),
          }),            
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: { value: '100' },
        },

        {
          amount: { value: '-100' },
        },
      ];

      const expectedMatches = undefined;

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('account is null: operation addresses are not equal: group descriptions not met');
      }

      expect(matches).to.deep.equal(expectedMatches);
    });    

    it('should match a simple transfer specifiying a type', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        opposite_amounts: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({ exists: true }),
            type: 'input',
          }),

          new OperationDescription({ 
            account: new AccountDescription({ exists: true }),
            type: 'output',
          }),            
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: { value: '100' },
          type: 'output',
        },

        {}, // should be ignored

        {
          account: { address: 'addr1' },
          amount: { value: '-100' },
          type: 'input',
        },
      ];

      const expectedMatches = [
        {
          operations: [{
            account: { address: 'addr1' },
            amount: { value: '-100' },
            type: 'input',
          }],

          amounts: [-100]
        },

        {
          operations: [{
            account: { address: 'addr2' },
            amount: { value: '100' },
            type: 'output',
          }],

          amounts: [100],
        }        
      ];

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        console.error(e);
      }

      expect(c(matches)).to.deep.equal(expectedMatches);
    });    

    it('should reject a simple transfer that has an unmatched description', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        err_unmatched: true,
        opposite_amounts: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative,
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),            
          }),            
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: { value: '100' },
        },

        {}, // should be ignored

        {
          account: { address: 'addr1' },
          amount: { value: '-100' },
        },
      ];

      const expectedMatches = undefined;

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        //console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('Unable to find match for operation at index 1');
      }

      expect(matches).to.deep.equal(expectedMatches);
    });    

    it('should reject a simple transfer with unequal amounts', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        equal_amounts: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative,
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),            
          }),            
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: { value: '100' }, // Yoshi: unequal? 
        },

        {}, // should be ignored

        {
          account: { address: 'addr1' },
          amount: { value: '-100' },
        },
      ];

      const expectedMatches = undefined;

      let matches;
      let thrown = false;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        //console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('100 is not equal to -100: operation amounts are not equal: group descriptions not met');
        thrown = true;
      }

      expect(thrown).to.equal(true);
      expect(matches).to.deep.equal(expectedMatches);
    });    

    it('should reject a simple transfer with invalid opposite amounts', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        opposite_amounts: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({ exists: true }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({ exists: true }),            
          }),            
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: { value: '100' },
        },

        {}, // should be ignored

        {
          account: { address: 'addr1' },
          amount: { value: '100' },
        },
      ];

      const expectedMatches = undefined;

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        //console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('100 and 100 have the same sign: group descriptions not met');
      }

      expect(matches).to.deep.equal(expectedMatches);
    });    

    it('should match a simple transfer using currency', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        opposite_amounts: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative,
              currency: {
                symbol: 'ETH',
                decimals: 18,
              },
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
              currency: {
                symbol: 'BTC',
                decimals: 8,
              },
            }),            
          }),            
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: {
            value: '100',
            currency: {
              symbol: 'BTC',
              decimals: 8,
            },
          },
        },

        {},

        {
          account: { address: 'addr1' },
          amount: {
            value: '-100',
            currency: {
              symbol: 'ETH',
              decimals: 18,
            },
          },
        },
      ];

      const expectedMatches = [
        {
          operations: [{
            account: { address: 'addr1' },
            amount: {
              value: '-100',
              currency: {
                symbol: 'ETH',
                decimals: 18,
              },
            },
          }],

          amounts: [-100],
        },

        {
          operations: [{
            account: { address: 'addr2' },
            amount: {
              value: '100',
              currency: {
                symbol: 'BTC',
                decimals: 8,
              },
            },
          }],

          amounts: [100],
        },
      ];

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        console.error(e);
      }

      expect(c(matches)).to.deep.equal(expectedMatches);
    });    

    it('should reject to match a simple transfer if it can\'t match the currency', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        opposite_amounts: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative,
              currency: {
                symbol: 'ETH',
                decimals: 18,
              },
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
              currency: {
                symbol: 'BTC',
                decimals: 8,
              },
            }),            
          }),            
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: {
            value: '100',
            currency: {
              symbol: 'ETH',
              decimals: 18,
            },
          },
        },

        {},

        {
          account: { address: 'addr1' },
          amount: {
            value: '-100',
            currency: {
              symbol: 'ETH',
              decimals: 18,
            },
          },
        },
      ];

      const expectedMatches = undefined;

      let matches;
      let thrown = false;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('Could not find match for description 1');
        thrown = true;
      }

      expect(thrown).to.equal(true);
      expect(c(matches)).to.deep.equal(expectedMatches);
    });   

    it('should reject a simple transfer (with sender metadata) and non-equal addresses', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        opposite_amounts: [[0, 1]],
        equal_addresses: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
              sub_account_exists: true,
              sub_account_address: 'sub',
              sub_account_metadata_keys: [
                { key: 'validator', value_kind: 'string' },
              ],
            }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative,
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({ exists: true }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),            
          }),            
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: { value: '100' },
        },

        {},

        {
          account: {
            address: 'addr1',
            sub_account: {
              address: 'sub',
              metadata: {
                'validator': '10',
              },
            },
          },

          amount: {
            value: '-100',
          },
        },
      ];

      const expectedMatches = undefined;

      let matches;
      let thrown = false;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('addr1 is not equal to addr2: operation addresses are not equal: group descriptions not met');
        thrown = true;
      }

      expect(thrown).to.equal(true);
      expect(c(matches)).to.deep.equal(expectedMatches);
    }); 

    it('should match a simple transfer (using sender metadata)', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        opposite_amounts: [[0, 1]],
        equal_addresses: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
              sub_account_exists: true,
              sub_account_address: 'sub',
              sub_account_metadata_keys: [{
                key: 'validator',
                value_kind: 'string',
              }],
            }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative,
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),            
          }),            
        ],
      });

      const operations = [
        {
          account: { address: 'addr1' },
          amount: { value: '100' },
        },

        {},

        {
          account: {
            address: 'addr1',
            sub_account: {
              address: 'sub',
              metadata: {
                'validator': '10',
              }
            },
          },
          amount: { value: '-100' },
        },
      ];

      const expectedMatches = [
        {
          operations: [{
            account: {
              address: 'addr1',
              sub_account: {
                address: 'sub',
                metadata: {
                  'validator': '10',
                }
              },
            },

            amount: {
              value: '-100',
            },            
          }],

          amounts: [-100],
        },

        {
          operations: [{
            account: { address: 'addr1' },
            amount: {
              value: '100',
            },
          }],

          amounts: [100],
        },
      ];

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        console.error(e);
      }

      expect(c(matches)).to.deep.equal(expectedMatches);
    });  

    it('should reject to match a simple transfer with missing sender address metadata', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        opposite_amounts: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
              sub_account_exists: true,
              sub_account_address: 'sub',
              sub_account_metadata_keys: [{
                key: 'validator',
                value_kind: 'string',
              }],
            }),
            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative,
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),            
          }),            
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: { value: '100' },
        },

        {},

        {
          account: { address: 'addr1' },
          amount: { value: '-100' },
        },
      ];

      const expectedMatches = undefined;

      let matches;
      let thrown = false;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('Could not find match for description 0');
        thrown = true;
      }

      expect(thrown).to.equal(true);
      expect(c(matches)).to.deep.equal(expectedMatches);
    });  

    it('should match nil amount ops', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
              sub_account_exists: true,
              sub_account_address: 'sub 2',
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({
              exists: true,
              sub_account_exists: true,
              sub_account_address: 'sub 1',
            }),
          }),            
        ],
      });

      const operations = [
        {
          account: {
            address: 'addr1',
            sub_account: {
              address: 'sub 1',
            },
          },
        },

        {
          account: {
            address: 'addr2',
            sub_account: {
              address: 'sub 2',
            },
          },

          amount: { value: '100' }, // allowed because no amount requirement provided
        },
      ];

      const expectedMatches = [
        {
          operations: [{
            account: {
              address: 'addr2',
              sub_account: {
                address: 'sub 2',
              },
            },

            amount: {
              value: '100',
            },            
          }],

          amounts: [100],
        },

        {
          operations: [{
            account: {
              address: 'addr1',
              sub_account: {
                address: 'sub 1',
              },
            },
          }],

          amounts: [null],
        },
      ];

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        console.error(e);
      }

      expect(c(matches)).to.deep.equal(expectedMatches);
    });   

    it('should reject to match nil amount ops (force false amount)', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
              sub_account_exists: true,
              sub_account_address: 'sub 2',
            }),

            amount: new AmountDescription({
              exists: false,
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({
              exists: true,
              sub_account_exists: true,
              sub_account_address: 'sub 1',
            }),
          }),            
        ],
      });

      const operations = [
        {
          account: {
            address: 'addr1',
            sub_account: {
              address: 'sub 1',
            },
          },
        },

        {
          account: {
            address: 'addr2',
            sub_account: {
              address: 'sub 2',
            },
          },

          amount: {}, // allowed because no amount requirement provided
        },
      ];

      const expectedMatches = undefined;

      let matches;
      let thrown;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('Could not find match for description 0');
        thrown = true;
      }

      expect(thrown).to.equal(true);
      expect(c(matches)).to.deep.equal(expectedMatches);
    }); 

    it('should match nil amount ops (only requiring metadata keys)', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
              sub_account_exists: true,
              sub_account_address: 'sub 2',
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({
              exists: true,
              sub_account_exists: true,
              sub_account_metadata_keys: [{
                key: 'validator',
                value_kind: 'number',
              }],
            }),
          }),            
        ],
      });

      const operations = [
        {
          account: {
            address: 'addr1',
            sub_account: {
              address: 'sub 1',
              metadata: {
                validator: -1000,
              }
            },
          },
        },

        {
          account: {
            address: 'addr2',
            sub_account: {
              address: 'sub 2',
            },
          },
        },
      ];

      const expectedMatches = [
        {
          operations: [{
            account: {
              address: 'addr2',
              sub_account: {
                address: 'sub 2',
              },
            },       
          }],

          amounts: [null],
        },

        {
          operations: [{
            account: {
              address: 'addr1',
              sub_account: {
                address: 'sub 1',
                metadata: {
                  validator: -1000,
                },
              },
            },
          }],

          amounts: [null],
        },
      ];

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        console.error(e);
      }

      expect(c(matches)).to.deep.equal(expectedMatches);
    });       
  
    it('should reject to match nil amount ops when sub account addresses mismatch', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
              sub_account_exists: true,
              sub_account_address: 'sub 2',
            }),
          }),

          new OperationDescription({ 
            account: new AccountDescription({
              exists: true,
              sub_account_exists: true,
              sub_account_address: 'sub 1',
            }),
          }),            
        ],
      });

      const operations = [
        {
          account: {
            address: 'addr1',
            sub_account: {
              address: 'sub 3',
            },
          },
        },

        {
          account: {
            address: 'addr2',
            sub_account: {
              address: 'sub 2',
            },
          },
        },
      ];

      const expectedMatches = undefined;

      let matches;
      let thrown = false;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('Could not find match for description 1');
        thrown = true;
      }

      expect(thrown).to.equal(true);
      expect(c(matches)).to.deep.equal(expectedMatches);
    }); 

    it('should reject to match nil descriptions', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
      });

      const operations = [
        {
          account: {
            address: 'addr1',
            sub_account: {
              address: 'sub 3',
            },
          },
        },

        {
          account: {
            address: 'addr2',
            sub_account: {
              address: 'sub 2',
            },
          },
        },
      ];

      const expectedMatches = undefined;

      let matches;
      let thrown = false;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('No descriptions to match');
        thrown = true;
      }

      expect(thrown).to.equal(true);
      expect(c(matches)).to.deep.equal(expectedMatches);
    });   

    it('should match two empty descriptions', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        operation_descriptions: [
          new OperationDescription({}),
          new OperationDescription({}),            
        ],
      });

      const operations = [
        {
          account: {
            address: 'addr1',
            sub_account: {
              address: 'sub 3',
            },
          },
        },

        {
          account: {
            address: 'addr2',
            sub_account: {
              address: 'sub 2',
            },
          },
        },
      ];

      const expectedMatches = [
        {
          operations: [{
            account: {
              address: 'addr1',
              sub_account: {
                address: 'sub 3',
              },
            },
          }],
          amounts: [null],  
        },

        {
          operations: [{
            account: {
              address: 'addr2',
              sub_account: {
                address: 'sub 2',
              },
            }
          }],
          amounts: [null],  
        },
      ];;

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        console.error(e);
      }

      expect(c(matches)).to.deep.equal(expectedMatches);
    }); 

    it('should reject to match empty operations', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        operation_descriptions: [
          new OperationDescription({}),
          new OperationDescription({}),            
        ],
      });

      const operations = [];

      const expectedMatches = undefined;

      let matches;
      let thrown = false;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        // console.error(e);
        thrown = true;
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('Unable to match anything to zero operations');
      }

      expect(thrown).to.equal(true);
      expect(c(matches)).to.deep.equal(expectedMatches);
    });     

    it('should match simple repeated op', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),

            allow_repeats: true,
          }),
        ],
      });

      const operations = [
        {
          account: {
            address: 'addr2',
          },

          amount: {
            value: '200',
          },
        },
        {},
        {
          account: {
            address: 'addr1',
          },
          amount: {
            value: '100',
          },          
        },
      ];

      const expectedMatches = [
        {
          operations: [{
            account: {
              address: 'addr2',
            },

            amount: {
              value: '200',
            },
          },

          {
            account: {
              address: 'addr1',
            },

            amount: {
              value: '100',
            },
          }],

          amounts: [200, 100],  
        },
      ];

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        console.error(e);
      }

      expect(c(matches)).to.deep.equal(expectedMatches);
    }); 

    it('should reject to match simple repeated op, when unmatched are not allowed', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),

            allow_repeats: true,
          }),
        ],

        err_unmatched: true,
      });

      const operations = [
        {
          account: {
            address: 'addr2',
          },

          amount: {
            value: '200',
          },
        },
        {},
        {
          account: {
            address: 'addr1',
          },
          amount: {
            value: '100',
          },          
        },
      ];

      const expectedMatches = undefined;

      let matches;
      let thrown = false;

      try {
        matches = parser.MatchOperations(descriptions, operations);
        
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('Unable to find match for operation at index 1');
        thrown = true;
      }

      expect(thrown).to.equal(true);
      expect(c(matches)).to.deep.equal(expectedMatches);
    });

    it('should reject to match simple repeated op with invalid comparison indexes', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        opposite_amounts: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),

            allow_repeats: true,
          }),
        ],
      });

      const operations = [
        {
          account: {
            address: 'addr2',
          },

          amount: {
            value: '200',
          },
        },
        {},
        {
          account: {
            address: 'addr1',
          },
          amount: {
            value: '100',
          },          
        },
      ];

      const expectedMatches = undefined;

      let matches;
      let thrown = false;

      try {
        matches = parser.MatchOperations(descriptions, operations);
        
      } catch (e) {
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('Match index 1 out of range: opposite amounts comparison error: group descriptions not met');
        thrown = true;
      }

      expect(thrown).to.equal(true);
      expect(c(matches)).to.deep.equal(expectedMatches);
    });

    it('should reject to match simple repeated op with overlapping, repeated descriptions', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),

            allow_repeats: true,
          }),

          new OperationDescription({ // this description should never be matched.
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),

            allow_repeats: true,
          }),          
        ],
      });

      const operations = [
        {
          account: {
            address: 'addr2',
          },

          amount: {
            value: '200',
          },
        },
        {},
        {
          account: {
            address: 'addr1',
          },
          amount: {
            value: '100',
          },          
        },
      ];

      const expectedMatches = undefined;

      let matches;
      let thrown = false;

      try {
        matches = parser.MatchOperations(descriptions, operations);
        
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('Could not find match for description 1');
        thrown = true;
      }

      expect(thrown).to.equal(true);
      expect(c(matches)).to.deep.equal(expectedMatches);
    });

    it('should match complex repeated ops', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),

            allow_repeats: true,
            type: 'output',
          }),

          new OperationDescription({ // this description should never be matched.
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative,
            }),

            allow_repeats: true,
            type: 'input',
          }),    

          new OperationDescription({ // this description should never be matched.
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative,
            }),

            allow_repeats: true,
          }),    
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: { value: '200' },
          type: 'output',
        },
        {
          account: { address: 'addr3' },
          amount: { value: '200' },
          type: 'output',
        },
        {
          account: { address: 'addr1' },
          amount: { value: '-200' },
          type: 'input',
        },    

        {
          account: { address: 'addr4' },
          amount: { value: '-200' },
          type: 'input',
        },

        {
          account: { address: 'addr5' },
          amount: { value: '-1000' },
          type: 'runoff',
        },        
      ];

      const expectedMatches = [
        {
          operations: [{
            account: { address: 'addr2' },
            amount: { value: '200' },
            type: 'output',
          },
          {
            account: { address: 'addr3' },
            amount: { value: '200' },
            type: 'output',
          }],

          amounts: [200, 200]
        },  

        {
          operations: [{
            account: { address: 'addr1' },
            amount: { value: '-200' },
            type: 'input',
          },
          {
            account: { address: 'addr4' },
            amount: { value: '-200' },
            type: 'input',
          }],

          amounts: [-200, -200]
        },     

        {
          operations: [{
            account: { address: 'addr5' },
            amount: { value: '-1000' },
            type: 'runoff',
          }],

          amounts: [-1000]
        },   
      ];

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        console.error(e);
      }

      expect(c(matches)).to.deep.equal(expectedMatches);
    });    

    it('should match an optional description, that is not met', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),

            allow_repeats: true,
          }),

          new OperationDescription({ // this description should never be matched.
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative,
            }),

            optional: true,
          }),
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: { value: '200' },
        },
        {},
        {
          account: { address: 'addr1' },
          amount: { value: '100' },
        },
      ];

      const expectedMatches = [
        {
          operations: [{
            account: { address: 'addr2' },
            amount: { value: '200' },
          },
          {
            account: { address: 'addr1' },
            amount: { value: '100' },
          }],

          amounts: [200, 100]
        },

        null, // optional not met, must not throw
      ];

      let matches;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        console.error(e);
      }

      expect(c(matches)).to.deep.equal(expectedMatches);
    });   

   it('should reject to match an optional description when equal amounts were not found', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        equal_amounts: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),

            allow_repeats: true,
          }),

          new OperationDescription({ // this description should never be matched.
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative,
            }),

            optional: true,
          }),
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: { value: '200' },
        },
        {},
        {
          account: { address: 'addr1' },
          amount: { value: '100' },
        },
      ];

      const expectedMatches = undefined;

      let matches;
      let thrown = false;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('Match index 1 is null: index 1 not valid: operation amounts are not equal: group descriptions not met');
        thrown = true;
      }

      expect(thrown).to.equal(true);
      expect(c(matches)).to.deep.equal(expectedMatches);
    });   

    it('should reject to match an optional description when opposite amounts were not found', async function () {
      const parser = new RosettaSDK.Parser();

      const descriptions = new Descriptions({
        opposite_amounts: [[0, 1]],
        operation_descriptions: [
          new OperationDescription({
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Positive,
            }),

            allow_repeats: true,
          }),

          new OperationDescription({ // this description should never be matched.
            account: new AccountDescription({
              exists: true,
            }),

            amount: new AmountDescription({
              exists: true,
              sign: Sign.Negative,
            }),

            optional: true,
          }),
        ],
      });

      const operations = [
        {
          account: { address: 'addr2' },
          amount: { value: '200' },
        },
        {},
        {
          account: { address: 'addr1' },
          amount: { value: '100' },
        },
      ];

      const expectedMatches = undefined;

      let matches;
      let thrown = false;

      try {
        matches = parser.MatchOperations(descriptions, operations);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('ParserError');
        expect(e.message).to.equal('Match index 1 is null: opposite amounts comparison error: group descriptions not met');
        thrown = true;
      }

      expect(thrown).to.equal(true);
      expect(c(matches)).to.deep.equal(expectedMatches);
    });   
  });

  describe('Test Match', function () {
    it('should handle an empty match correctly', async function () {
      const op = null;
      const amount = null;
      const match = new RosettaSDK.Parser.Match({}).first();

      expect(match.operation).to.deep.equal(op);
      expect(match.amount).to.deep.equal(amount);
    });

    it('should handle a single op match', async function () {
      const op = {
        operation_identifier: { index: 1 },
      };

      const amount = 100;

      const match = new RosettaSDK.Parser.Match({
        operations: [{
          operation_identifier: { index: 1 },
        }],

        amounts: [100],
      }).first();

      expect(match.operation).to.deep.equal(op);
      expect(match.amount).to.deep.equal(amount);
    });

    it('should handle multi op match properly', async function () {
      const op = {
        operation_identifier: { index: 1 },
      };

      const amount = 100;

      const match = new RosettaSDK.Parser.Match({
        operations: [{
          operation_identifier: { index: 1 },
        }, {
          operation_identifier: { index: 2 },
        }],

        amounts: [100, 200],
      }).first();

      expect(match.operation).to.deep.equal(op);
      expect(match.amount).to.deep.equal(amount);
    });

    it('should handle multi op match with null amount correctly', async function () {
      const op = {
        operation_identifier: { index: 1 },
      };

      const amount = null;

      const match = new RosettaSDK.Parser.Match({
        operations: [{
          operation_identifier: { index: 1 },
        }],

        amounts: [null],
      }).first();

      expect(match.operation).to.deep.equal(op);
      expect(match.amount).to.deep.equal(amount);
    });

  });
});