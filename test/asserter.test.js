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

// asserter.test.js

// server.test.js
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const RosettaSDK = require('..');

const {
  constructPartialBlockIdentifier,
} = require('../lib/utils');

const c = (j) => j == undefined ? undefined : JSON.parse(JSON.stringify(j));

const T = RosettaSDK.Client;

const createTempDir = () => {
  return new Promise((fulfill, reject) => {
    fs.mkdtemp('rosetta-test', (err, dir) => {
      if (err) return reject();
      return fulfill(dir);
    });    
  });
};

describe('Asserter Tests', function () {
  describe('Main', function () {
    const validNetwork = T.NetworkIdentifier.constructFromObject({
      blockchain: 'hello',
      network: 'world',
    });

    const validNetworkStatus = T.NetworkStatusResponse.constructFromObject({
      current_block_identifier: T.BlockIdentifier.constructFromObject({
        index: 0,
        hash: 'block 0',
      }),      
      genesis_block_identifier: T.BlockIdentifier.constructFromObject({
        index: 100,
        hash: 'block 100',        
      }),
      current_block_timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
      peers: [
        { peer_id: 'peer 1' },
      ],
    });

    const invalidNetworkStatus = T.NetworkStatusResponse.constructFromObject({
      current_block_identifier: T.BlockIdentifier.constructFromObject({
        index: 100,
        hash: 'block 100',
      }),
      current_block_timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
      peers: [
        { peer_id: 'peer 1' },
      ],
    });

    const validNetworkOptions = T.NetworkOptionsResponse.constructFromObject({
      version: new T.Version('1.4.1', '1.0'),
      allow: T.Allow.constructFromObject({
        operation_statuses: [
          new T.OperationStatus('Success', true),
        ],
        operation_types: ['Transfer'],
        errors: [
          new T.Error(1, 'error', true),
        ],
        // historical_balance_lookup: true,
      }),
    });

    const invalidNetworkOptions = T.NetworkOptionsResponse.constructFromObject({
      version: new T.Version('1.4.1', '1.0'),
      allow: T.Allow.constructFromObject({
        operation_statuses: [],
        operation_types: ['Transfer'],
        errors: [
          new T.Error(1, 'error', true),
        ],
      }),
    });    

    const duplicateStatuses = T.NetworkOptionsResponse.constructFromObject({
      version: new T.Version('1.4.1', '1.0'),
      allow: T.Allow.constructFromObject({
        operation_statuses: [
          new T.OperationStatus('Success', true),
          new T.OperationStatus('Success', true),
        ],
        operation_types: ['Transfer'],
        errors: [
          new T.Error(1, 'error', true),
        ],
      }),
    });     

    const duplicateTypes = T.NetworkOptionsResponse.constructFromObject({
      version: new T.Version('1.4.1', '1.0'),
      allow: T.Allow.constructFromObject({
        operation_types: ['Transfer', 'Transfer'],
        operation_statuses: [new T.OperationStatus('Success', true)],
        errors: [
          new T.Error(1, 'error', true),
        ],
      }),
    });  

    const tests = {
      "valid responses": {
        network:        validNetwork,
        networkStatus:  validNetworkStatus,
        networkOptions: validNetworkOptions,

        err: null,
      },
      "invalid network status": {
        network:        validNetwork,
        networkStatus:  invalidNetworkStatus,
        networkOptions: validNetworkOptions,

        err: "BlockIdentifier is null",
      },
      "invalid network options": {
        network:        validNetwork,
        networkStatus:  validNetworkStatus,
        networkOptions: invalidNetworkOptions,

        err: "No Allow.operation_statuses found",
      },
      "duplicate operation statuses": {
        network:        validNetwork,
        networkStatus:  validNetworkStatus,
        networkOptions: duplicateStatuses,

        err: "Allow.operation_statuses contains a duplicate element: Success",
      },
      "duplicate operation types": {
        network:        validNetwork,
        networkStatus:  validNetworkStatus,
        networkOptions: duplicateTypes,

        err: "Allow.operation_statuses contains a duplicate element: Transfer",
      },
    };

    for (const test of Object.keys(tests)) {
      const testName = test;
      const testParams = tests[test];

      it(`should pass case '${testName}' with responses`, function () {
        let client;
        let configuration;

        try {
          client = RosettaSDK.Asserter.NewClientWithResponses(
            testParams.network,
            testParams.networkStatus,
            testParams.networkOptions,
          );
        } catch (e) {
          // console.error(e)
          expect(e.message).to.equal(testParams.err);
          return;
        }

        expect(client).to.not.equal(null);

        let thrown = false;

        try {
          configuration = client.getClientConfiguration();
        } catch (e) {
          console.error(e);
          thrown = true;
        }

        expect(thrown).to.equal(false);
        expect(configuration.network_identifier).to.equal(testParams.network)
        expect(configuration.genesis_block_identifier).to.equal(testParams.networkStatus.genesis_block_identifier);
        expect(configuration.allowed_operation_types).to.deep.equal(testParams.networkOptions.allow.operation_types);
        expect(configuration.allowed_operation_statuses).to.deep.equal(testParams.networkOptions.allow.operation_statuses);
      });

      it(`should pass case '${testName}' with file`, async function () {
        let dirpath;
        let filepath;
        let configuration;
        let client;
        let thrown = false;

        dirpath = await createTempDir();

        setTimeout(() => {
          // cleanup
          if (fs.existsSync(filepath))
            fs.unlinkSync(filepath);

          fs.rmdirSync(dirpath);
        }, 100);

        configuration = {
          network_identifier: testParams.network,
          genesis_block_identifier: testParams.networkStatus.genesis_block_identifier,
          allowed_operation_types: testParams.networkOptions.allow.operation_types,
          allowed_operation_statuses: testParams.networkOptions.allow.operation_statuses,
          allowed_errors: testParams.networkOptions.allow.errors,
        };

        filepath = path.join(dirpath, 'test.json');
        fs.writeFileSync(filepath, JSON.stringify(configuration));

        try {
          client = RosettaSDK.Asserter.NewClientWithFile(filepath);
        } catch(f) {
          // console.error(f)
          expect(f.message).to.equal(testParams.err);
          return;
        }

        try {
          configuration = client.getClientConfiguration();
        } catch (f) {
          // console.error(f);
          thrown = true;
        }    

        expect(thrown).to.equal(false);

        expect((configuration.network_identifier))
          .to.deep.equal(c(testParams.network))

        expect((configuration.genesis_block_identifier))
          .to.deep.equal((testParams.networkStatus.genesis_block_identifier));

        expect((configuration.allowed_operation_types))
          .to.deep.equal((testParams.networkOptions.allow.operation_types));

        expect((configuration.allowed_operation_statuses))
          .to.deep.equal((testParams.networkOptions.allow.operation_statuses));
      });        
    } 
  });

  describe('Block Tests', function () {
    const asserter = new RosettaSDK.Asserter();

    it('should successfully validate a block', async function () {
      let thrown = false;

      try {
        const block = new RosettaSDK.Client.BlockIdentifier(1, 'block 1');
        asserter.BlockIdentifier(block);
      } catch (e) {
        console.error(e);
        thrown = true; 
      }

      expect(thrown).to.equal(false);
    });

    it('should fail when blockidentifier is null', async function () {
      let thrown = false;

      try {
        const block = null;
        asserter.BlockIdentifier(block);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('BlockIdentifier is null');
        thrown = true; 
      }

      expect(thrown).to.equal(true);
    });

    it('should fail due to a negative index', async function () {
      let thrown = false;

      try {
        const block = new RosettaSDK.Client.BlockIdentifier(-1, 'block 1');
        asserter.BlockIdentifier(block);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('BlockIdentifier.index is negative');
        thrown = true; 
      }

      expect(thrown).to.equal(true);
    });

    it('should detect an invalid block hash', async function () {
      let thrown = false;

      try {
        const block = new RosettaSDK.Client.BlockIdentifier(1, '');
        asserter.BlockIdentifier(block);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('BlockIdentifier.hash is missing');
        thrown = true; 
      }

      expect(thrown).to.equal(true);
    });
  });

  describe('Test Amount', function () {
    const asserter = new RosettaSDK.Asserter();
    const { Amount, Currency } = RosettaSDK.Client;

    it('should correctly handle a valid amount', async function () {
      let thrown = false;

      try {
        const amount = new Amount('100000', new Currency('BTC', 1));
        asserter.Amount(amount);
      } catch (e) {
        console.error(e);
        thrown = true; 
      }

      expect(thrown).to.equal(false);
    });

    it('should correctly handle a valid amount with no decimals', async function () {
      let thrown = false;

      try {
        const amount = new Amount('100000', new Currency('BTC'));
        asserter.Amount(amount);
      } catch (e) {
        console.error(e);
        thrown = true; 
      }

      expect(thrown).to.equal(false);
    });

    it('should correctly handle a negative amount', async function () {
      let thrown = false;

      try {
        const amount = new Amount('-100000', new Currency('BTC', 1));
        asserter.Amount(amount);
      } catch (e) {
        console.error(e);
        thrown = true; 
      }

      expect(thrown).to.equal(false);
    });

    it('should throw when having detecting no amount', async function () {
      let thrown = false;

      try {
        const amount = null;
        asserter.Amount(amount);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Amount.value is missing');
        thrown = true; 
      }

      expect(thrown).to.equal(true);
    });    

    it('should throw when currency is missing', async function () {
      let thrown = false;

      try {
        const amount = new Amount('100000', null);
        asserter.Amount(amount);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Amount.currency is null');
        thrown = true; 
      }

      expect(thrown).to.equal(true);
    });       

    it('should throw if amount.value is not a number', async function () {
      let thrown = false;

      try {
        const amount = new Amount('xxxx', new Currency('BTC', 1));
        asserter.Amount(amount);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Amount.value is not an integer: xxxx');
        thrown = true; 
      }

      expect(thrown).to.equal(true);
    });  

    it('should throw when detecting a non-int', async function () {
      let thrown = false;

      try {
        const amount = new Amount('1.1', new Currency('BTC', 1));
        asserter.Amount(amount);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Amount.value is not an integer: 1.1');
        thrown = true; 
      }

      expect(thrown).to.equal(true);
    });   

    it('should throw when passing an invalid symbol', async function () {
      let thrown = false;

      try {
        const amount = new Amount('11', new Currency(null, 1));
        asserter.Amount(amount);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Amount.currency does not have a symbol');
        thrown = true; 
      }

      expect(thrown).to.equal(true);      
    });     

    it('should throw when detecting invalid decimals', async function () {
      let thrown = false;

      try {
        const amount = new Amount('111', new Currency('BTC', -1));
        asserter.Amount(amount);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Amount.currency.decimals must be positive. Found: -1');
        thrown = true; 
      }

      expect(thrown).to.equal(true); 
    });     
  });

  describe('Test OperationIdentifier', function () {
    const asserter = new RosettaSDK.Asserter();
    const { OperationIdentifier } = RosettaSDK.Client;

    const validNetworkIndex = 1;
    const invalidNetworkIndex = -1;

    it('should assert a valid identifier', async function () {
      let thrown = false;

      try {
        const opId = new OperationIdentifier(0);
        const index = 0;
        asserter.OperationIdentifier(opId, index);
      } catch (e) {
        console.error(e);
        thrown = true; 
      }

      expect(thrown).to.equal(false);       
    });

    it('should throw when passing null as identifier', async function () {
      let thrown = false;

      try {
        const opId = null;
        const index = 0;
        asserter.OperationIdentifier(opId, index);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('OperationIdentifier is null');
        thrown = true; 
      }

      expect(thrown).to.equal(true);       
    });    

    it('should throw when passing out of order index', async function () {
      let thrown = false;

      try {
        const opId = new OperationIdentifier(0);
        const index = 1;
        asserter.OperationIdentifier(opId, index);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('OperationIdentifier.index 0 is out of order, expected 1');
        thrown = true; 
      }

      expect(thrown).to.equal(true);       
    });      

    it('should assert a valid identifier with a networkIndex properly', async function () {
      let thrown = false;

      try {
        const opId = new OperationIdentifier(0);
        opId.network_index = validNetworkIndex;

        const index = 0;
        asserter.OperationIdentifier(opId, index);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('OperationIdentifier.index 0 is out of order, expected 1');
        thrown = true; 
      }

      expect(thrown).to.equal(false);       
    });   

    it('should throw when passing a valid identifier with an invalid networkIndex', async function () {
      let thrown = false;

      try {
        const opId = new OperationIdentifier(0);
        opId.network_index = invalidNetworkIndex;

        const index = 0;
        asserter.OperationIdentifier(opId, index);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('OperationIdentifier.network_index is invalid');
        thrown = true; 
      }

      expect(thrown).to.equal(true);       
    });  
  });

  describe('Test AccountIdentifier', function () {
    const asserter = new RosettaSDK.Asserter();
    const { AccountIdentifier, SubAccountIdentifier } = RosettaSDK.Client;   
    
    it('should assert a valid identifier properly', async function () {
      let thrown = false;

      try {
        const accId = new AccountIdentifier('acct1');
        asserter.AccountIdentifier(accId);
      } catch (e) {
        console.error(e);
        thrown = true; 
      }

      expect(thrown).to.equal(false);        
    }); 

    it('should throw when passing an invalid address', async function () {
      let thrown = false;

      try {
        const accId = new AccountIdentifier('');
        asserter.AccountIdentifier(accId);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Account.address is missing');
        thrown = true; 
      }

      expect(thrown).to.equal(true);        
    }); 

    it('should assert a valid identifier with subaccount', async function () {
      let thrown = false;

      try {
        const accId = new AccountIdentifier('acct1');
        accId.sub_account = new SubAccountIdentifier('acct2');
        asserter.AccountIdentifier(accId);
      } catch (e) {
        console.error(e);
        thrown = true; 
      }

      expect(thrown).to.equal(false);        
    }); 

    it('throw when passing an invalid identifier with subaccount', async function () {
      let thrown = false;

      try {
        const accId = new AccountIdentifier('acct1');
        accId.sub_account = new SubAccountIdentifier('');
        asserter.AccountIdentifier(accId);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Account.sub_account.address is missing');
        thrown = true; 
      }

      expect(thrown).to.equal(true);        
    }); 
  });

  describe('Test Operation', function () {
    const asserter = new RosettaSDK.Asserter();
    const {
      Amount,
      Currency,
      OperationIdentifier,
      Operation,
      AccountIdentifier,
      NetworkIdentifier,
      BlockIdentifier,
      Peer, 
      NetworkOptionsResponse,
      NetworkStatusResponse,
      Version,
      Allow,
      OperationStatus,
    } = RosettaSDK.Client;      

    const validAmount = new Amount('1000', new Currency('BTC', 8));
    const validAccount = new AccountIdentifier('test');

    const tests = {
      'valid operation': {
        operation: Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          type:    'PAYMENT',
          status:  'SUCCESS',
          account: validAccount,
          amount:  validAmount,
        }),
        index:      1,
        successful: true,
        err:        null,
      },
      'valid operation no account': {
        operation: Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          type:   'PAYMENT',
          status: 'SUCCESS',
        }),
        index:      1,
        successful: true,
        err:        null,
      },
      'nil operation': {
        operation: null,
        index:     1,
        err:       'Operation is null',
      },
      'invalid operation no account': {
        operation: Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          type:   'PAYMENT',
          status: 'SUCCESS',
          amount: validAmount,
        }),
        index: 1,
        err:   'operation.account is invalid in operation 1: Account is null',
      },
      'invalid operation empty account': {
        operation: Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          type:    'PAYMENT',
          status:  'SUCCESS',
          account: new AccountIdentifier(),
          amount:  validAmount,
        }),
        index: 1,
        err:   'operation.account is invalid in operation 1: Account.address is missing',
      },
      'invalid operation invalid index': {
        operation: Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          type:   'PAYMENT',
          status: 'SUCCESS',
        }),
        index: 2,
        err:   'Operation.identifier is invalid in operation 2: OperationIdentifier.index 1 is out of order, expected 2',
      },
      'invalid operation invalid type': {
        operation: Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          type:   'STAKE',
          status: 'SUCCESS',
        }),
        index: 1,
        err:   'Operation.type is invalid in operation 1: Operation.type STAKE is invalid',
      },
      'unsuccessful operation': {
        operation: Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          type:   'PAYMENT',
          status: 'FAILURE',
        }),
        index:      1,
        successful: false,
        err:        null,
      },
      'invalid operation invalid status': {
        operation: Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          type:   'PAYMENT',
          status: 'DEFERRED',
        }),
        index: 1,
        err:   'Operation.status is invalid in operation 1: OperationStatus.status DEFERRED is not valid',
      },
      'valid construction operation': {
        operation: Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          type:    'PAYMENT',
          account: validAccount,
          amount:  validAmount,
        }),
        index:        1,
        successful:   false,
        construction: true,
        err:          null,
      },
      'invalid construction operation': {
        operation: Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          type:    'PAYMENT',
          status:  'SUCCESS',
          account: validAccount,
          amount:  validAmount,
        }),
        index:        1,
        successful:   false,
        construction: true,
        err:          'Operation.status must be empty for construction',
      },
    };

    for (let testName of Object.keys(tests)) {
      const testParams = tests[testName];

      const networkIdentifier = new NetworkIdentifier('hello', 'world');

      const networkStatusResponse = NetworkStatusResponse.constructFromObject({
        genesis_block_identifier: new BlockIdentifier(0, 'block 0'),
        current_block_identifier: new BlockIdentifier(100, 'block 100'),
        current_block_timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
        peers: [ new Peer('peer 1') ],
      });

      const networkOptionsResponse = NetworkOptionsResponse.constructFromObject({
        version: new Version('1.4.1', '1.0'),
        allow: new Allow([
          new OperationStatus('SUCCESS', true),
          new OperationStatus('FAILURE', false),
        ], ['PAYMENT']),
      });

      let asserter;

      try {
        asserter = RosettaSDK.Asserter.NewClientWithResponses(
          networkIdentifier,
          networkStatusResponse,
          networkOptionsResponse,
        );
      } catch (e) {
        console.error(e);
      }

      it(`should pass test case '${testName}'`, async function () {
        expect(asserter).to.not.equal(undefined);

        let thrown = false;

        try {
          asserter.Operation(testParams.operation, testParams.index, testParams.construction);
        } catch (e) {
          // console.error(e);
          expect(e.message).to.equal(testParams.err);
          thrown = true;   
        }

        expect(thrown).to.equal(testParams.err != null);

        if (!thrown && !testParams.construction) {
          let success;

          try {
            success = asserter.OperationSuccessful(testParams.operation);
          } catch (e) {
            console.error(e);
            thrown = true;
          } finally {
            expect(thrown).to.equal(false);
            expect(success).to.equal(testParams.successful);
          }
        }
      });
    }
  });

  describe('ConstructionMetadataResponse Tests', function () {
    const asserter = new RosettaSDK.Asserter();

    const {
      ConstructionMetadataResponse,
    } = RosettaSDK.Client;

    it('should assert a valid response', async function () {
      let thrown = false;

      let metadata = {
      };

      let response = new ConstructionMetadataResponse(metadata);

      try {
        asserter.ConstructionMetadataResponse(response)
      } catch (e) {
        console.error(e);
        thrown = true;
      }

      expect(thrown).to.equal(false);      
    });

    it('should throw on a null response', async function () {
      let thrown = false;

      let metadata = {
      };

      let response = null;

      try {
        asserter.ConstructionMetadataResponse(response)
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('ConstructionMetadataResponse cannot be null');
        thrown = true;
      }

      expect(thrown).to.equal(true);      
    });   

    it('should throw on invalid metadata', async function () {
      let thrown = false;

      let metadata = null;
      let response = new ConstructionMetadataResponse(metadata);

      try {
        asserter.ConstructionMetadataResponse(response)
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('ConstructionMetadataResponse.metadata is null');
        thrown = true;
      }

      expect(thrown).to.equal(true);      
    });    
  });

  describe('Test TransactionIdentifierResponse', function () {
    const asserter = new RosettaSDK.Asserter();

    const {
      TransactionIdentifierResponse,
      TransactionIdentifier,
    } = RosettaSDK.Client;

    it('should assert a valid response properly', async function () {
      let thrown = false;

      let txId = new TransactionIdentifier('tx1');
      let response = new TransactionIdentifierResponse(txId);

      try {
        asserter.TransactionIdentifierResponse(response);
      } catch (e) {
        console.error(e);
        thrown = true;
      }

      expect(thrown).to.equal(false);         
    });

    it('should throw when passing null', async function () {
      let thrown = false;

      let txId = new TransactionIdentifier('tx1');

      try {
        asserter.TransactionIdentifierResponse(null);
      } catch (e) {
        expect(e.message).to.equal('transactionIdentifierResponse cannot be null');
        thrown = true;
      }

      expect(thrown).to.equal(true);         
    });

    it('should throw when transaction identifier is invalid', async function () {
      let thrown = false;

      let txId = new TransactionIdentifier();
      let response = new TransactionIdentifierResponse(txId);

      try {
        asserter.TransactionIdentifierResponse(response);
      } catch (e) {
        expect(e.message).to.equal('TransactionIdentifier.hash is missing');
        thrown = true;
      }

      expect(thrown).to.equal(true);         
    });
  });

  describe('Test ConstructionCombineResponse', function () {
    const asserter = new RosettaSDK.Asserter();

    const {
      ConstructionCombineResponse,
      TransactionIdentifier,
    } = RosettaSDK.Client;    

    it('should assert a valid response properly', async function () {
      let thrown = false;

      let response = new ConstructionCombineResponse('signed tx');

      try {
        asserter.ConstructionCombineResponse(response);
      } catch (e) {
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });  

    it('should throw when passing null', async function () {
      let thrown = true;

      try {
        asserter.ConstructionCombineResponse(null);
      } catch (e) {
        thrown = true;
        expect(e.message).to.equal('constructionCombineResponse cannot be null');
      }

      expect(thrown).to.equal(true);      
    });

    it('should throw when the signed transaction is empty', async function () {
      let thrown = true;

      try {
        let response = new ConstructionCombineResponse();
        asserter.ConstructionCombineResponse(response);
      } catch (e) {
        thrown = true;
        expect(e.message).to.equal('constructionCombineResponse.signed_transaction must be a string');
      }

      expect(thrown).to.equal(true);     
    });
  });

  describe('Test ConstructionDeriveResponse', function () {
    const asserter = new RosettaSDK.Asserter();

    const {
      ConstructionDeriveResponse,
    } = RosettaSDK.Client;    

    it('should assert a valid response properly', async function () {
      let thrown = false;

      let response = ConstructionDeriveResponse.constructFromObject({
        address: 'addr',
        metadata: { 'hello': 'moto' },
      });

      try {
        asserter.ConstructionDeriveResponse(response);
      } catch (e) {
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });  

    it('should throw when passing null', async function () {
      let thrown = true;

      try {
        asserter.ConstructionDeriveResponse(null);
      } catch (e) {
        thrown = true;
        expect(e.message).to.equal('constructionDeriveResponse cannot be null');
      }

      expect(thrown).to.equal(true);      
    });

    it('should throw when the address is empty', async function () {
      let thrown = true;

      try {
        let response = ConstructionDeriveResponse.constructFromObject({
          metadata: { 'hello': 'moto' },
        });

        asserter.ConstructionDeriveResponse(response);
      } catch (e) {
        thrown = true;
        expect(e.message).to.equal('constructionDeriveResponse.address must be a string');
      }

      expect(thrown).to.equal(true);     
    });
  });

  describe('Test ConstructionParseResponse', function () {
    const {
      ConstructionParseResponse,
      Operation,
      Amount,
      AccountIdentifier,
      OperationIdentifier,
      Currency,
      NetworkIdentifier,
      NetworkStatusResponse,
      BlockIdentifier,
      Peer,
      NetworkOptionsResponse,
      Version,
      Allow,
      OperationStatus,
    } = RosettaSDK.Client;    

    const validAmount = new Amount('1000', new Currency('BTC', 8));
    const validAccount = new AccountIdentifier('test');

    const tests = {
      'valid response': {
        response: ConstructionParseResponse.constructFromObject({
          operations: [
            Operation.constructFromObject({
              operation_identifier: new OperationIdentifier(0),
              type:    'PAYMENT',
              account: validAccount,
              amount:  validAmount,
            }),
            Operation.constructFromObject({
              operation_identifier: new OperationIdentifier(1),
              related_operations: [
                new OperationIdentifier(0),
              ],
              type:    'PAYMENT',
              account: validAccount,
              amount:  validAmount,
            }),
          ],
          signers: ['account 1'],
          metadata: {
            'extra': 'stuff',
          },
        }),
        signed: true,
        err:    null,
      },
      'null response': {
        err: 'constructionParseResponse cannot be null',
      },
      'no operations': {
        response: ConstructionParseResponse.constructFromObject({
          signers: ['account 1'],
          metadata: {
            'extra': 'stuff',
          },
        }),
        err: 'operations cannot be empty',
      },
      'invalid operation ordering': {
        response: ConstructionParseResponse.constructFromObject({
          operations: [
            {
              operation_identifier: new OperationIdentifier(1),
              type:    'PAYMENT',
              account: validAccount,
              amount:  validAmount,
            },
          ],
          signers: ['account 1'],
          metadata: {
            'extra': 'stuff',
          },
        }),
        err: 'unable to parse operations: Operation.identifier is invalid in operation 0: OperationIdentifier.index 1 is out of order, expected 0',
      },
      'no signers': {
        response: ConstructionParseResponse.constructFromObject({
          operations: [
            {
              operation_identifier: new OperationIdentifier(0),
              type:    'PAYMENT',
              account: validAccount,
              amount:  validAmount,
            },
            {
              operation_identifier: new OperationIdentifier(1),
              related_operations: [
                new OperationIdentifier(0),
              ],
              type:    'PAYMENT',
              account: validAccount,
              amount:  validAmount,
            },
          ],
          metadata: {
            'extra': 'stuff',
          },
        }),
        signed: true,
        err:    'signers cannot be empty',
      },
      'empty string signer': {
        response: ConstructionParseResponse.constructFromObject({
          operations: [
            {
              operation_identifier: new OperationIdentifier(0),
              type:    'PAYMENT',
              account: validAccount,
              amount:  validAmount,
            },
            {
              operation_identifier: new OperationIdentifier(1),
              related_operations: [
                new OperationIdentifier(0),
              ],
              type:    'PAYMENT',
              account: validAccount,
              amount:  validAmount,
            },
          ],
          signers: [''],
          metadata: {
            'extra': 'stuff',
          },
        }),
        signed: true,
        err:    'signer 0 cannot be empty string',
      },
      'invalid signer unsigned': {
        response: ConstructionParseResponse.constructFromObject({
          operations: [
            {
              operation_identifier: new OperationIdentifier(0),
              type:    'PAYMENT',
              account: validAccount,
              amount:  validAmount,
            },
            {
              operation_identifier: new OperationIdentifier(1),
              related_operations: [
                new OperationIdentifier(0),
              ],
              type:    'PAYMENT',
              account: validAccount,
              amount:  validAmount,
            },
          ],
          metadata: {
            'extra': 'stuff',
          },
          signers: ['account 1'],
        }),
        signed: false,
        err:    'signers should be empty for unsigned txs',
      },
      'valid response unsigned': {
        response: ConstructionParseResponse.constructFromObject({
          operations: [
            {
              operation_identifier: new OperationIdentifier(0),
              type:    'PAYMENT',
              account: validAccount,
              amount:  validAmount,
            },
            {
              operation_identifier: new OperationIdentifier(1),
              related_operations: [
                new OperationIdentifier(0),
              ],
              type:    'PAYMENT',
              account: validAccount,
              amount:  validAmount,
            },
          ],
          metadata: {
            'extra': 'stuff',
          },
        }),
        signed: false,
        err:    null,
      },      
    };

    const asserter = RosettaSDK.Asserter.NewClientWithResponses(
      new NetworkIdentifier('hello', 'world'),
      new NetworkStatusResponse(
        new BlockIdentifier(100, 'block 100'),
        RosettaSDK.Asserter.MinUnixEpoch + 1,
        new BlockIdentifier(0, 'block 0'),
        [
          new Peer('peer 1'),
        ],
      ),
      new NetworkOptionsResponse(
        new Version('1.4.1', '1.0'),
        new Allow([
          new OperationStatus('SUCCESS', true),
          new OperationStatus('FAILURE', false),
        ], [
          'PAYMENT',
        ]),
      ),
    );

    for (let testName in tests) {
      const testParams = tests[testName];

      it(`should pass the test '${testName}'`, async function () {
        let thrown = false;
        try {
          asserter.ConstructionParseResponse(testParams.response, testParams.signed);
        } catch (e) {
          thrown = true;

          expect(e.message).to.equal(testParams.err)
        }

        expect(thrown).to.equal(testParams.err != null);
      });
    }
  });

  describe('Test ConstructionPayloadsResponse', function () {  
    const asserter = new RosettaSDK.Asserter();

    const {
      ConstructionPayloadsResponse,
      SigningPayload,
    } = RosettaSDK.Client;       

    it('should assert a valid response properly', async function () {
      let thrown = false;
      let response = new ConstructionPayloadsResponse(
        'tx blob', [
          new SigningPayload('hello', '48656c6c6f20476f7068657221'),
        ],
      );

      try {
        asserter.ConstructionPayloadsResponse(response);
      } catch (e) {
        console.log(e)
        thrown = true;
      }

      expect(thrown).to.equal(false);      
    });

    it('should throw when passing null', async function () {
      let thrown = false;

      try {
        asserter.ConstructionPayloadsResponse(null);
      } catch (e) {
        expect(e.message).to.equal('constructionPayloadsResponse cannot be null');
        thrown = true;
      }

      expect(thrown).to.equal(true);      
    });

    it('should throw when the unsigned transaction is empty', async function () {
      let thrown = false;
      let response = new ConstructionPayloadsResponse(
        null, [
          new SigningPayload('hello', '48656c6c6f20476f7068657221'),
        ],
      );

      try {
        asserter.ConstructionPayloadsResponse(response);
      } catch (e) {
        thrown = true;
        expect(e.message).to.equal('unsigned transaction cannot be empty');
      }

      expect(thrown).to.equal(true);      
    });

    it('should throw when the signing payload is empty', async function () {
      let thrown = false;
      let response = new ConstructionPayloadsResponse(
        'tx blob',
      );

      try {
        asserter.ConstructionPayloadsResponse(response);
      } catch (e) {
        thrown = true;
        expect(e.message).to.equal('signing payloads cannot be empty');
      }

      expect(thrown).to.equal(true);   
    });

    it('should throw when the signing payload is invalid', async function () {
      let thrown = false;
      let response = new ConstructionPayloadsResponse(
        'tx blob', [
          new SigningPayload(null, '48656c6c6f20476f7068657221'),
        ],
      );

      try {
        asserter.ConstructionPayloadsResponse(response);
      } catch (e) {
        thrown = true;
        expect(e.message).to.equal('Signing Payload 0 is invalid: signing payload cannot be empty');
      }

      expect(thrown).to.equal(true);  
    });
  });

  describe('Test PublicKey', function () {  
    const asserter = new RosettaSDK.Asserter();

    const {
      PublicKey,
      CurveType,
    } = RosettaSDK.Client;       

    it('should assert a valid public key properly', async function () {
      let thrown = false;
      let pk = new PublicKey('affe', new CurveType().secp256k1);

      try {
        asserter.PublicKey(pk);
      } catch (e) {
        console.log(e)
        thrown = true;
      }

      expect(thrown).to.equal(false);      
    });

    it('should throw when passing null', async function () {
      let thrown = false;

      try {
        asserter.PublicKey(null);
      } catch (e) {
        expect(e.message).to.equal('public_key cannot be null');
        thrown = true;
      }

      expect(thrown).to.equal(true);      
    });

    it('should throw the public key is empty', async function () {
      let thrown = false;
      let pk = new PublicKey(null, new CurveType().secp256k1);

      try {
        asserter.PublicKey(pk);
      } catch (e) {
        thrown = true;
        expect(e.message).to.equal('public key bytes cannot be empty');
      }

      expect(thrown).to.equal(true);      
    });

    it('should throw when the curveType is invalid', async function () {
      let thrown = false;
      let pk = new PublicKey('affe', 'test');

      try {
        asserter.PublicKey(pk);
      } catch (e) {
        thrown = true;
        expect(e.message).to.equal('public key curve type is not supported: "test" is not a supported CurveType');
      }

      expect(thrown).to.equal(true);   
    });
  });

  describe('Test SigningPayload', function () {  
    const asserter = new RosettaSDK.Asserter();

    const {
      SigningPayload,
      SignatureType,
    } = RosettaSDK.Client;       

    it('should assert a valid signing payload properly', async function () {
      let thrown = false;
      let signature = new SigningPayload('address', 'affe');

      try {
        asserter.SigningPayload(signature);
      } catch (e) {
        console.log(e)
        thrown = true;
      }

      expect(thrown).to.equal(false);      
    });

    it('should assert a valid signing payload with signature type properly', async function () {
      let thrown = false;
      let signature = new SigningPayload('address', 'affe', new SignatureType().ed25519);

      try {
        asserter.SigningPayload(signature);
      } catch (e) {
        console.log(e)
        thrown = true;
      }

      expect(thrown).to.equal(false);      
    });

    it('should throw when passing null', async function () {
      let thrown = false;

      try {
        asserter.SigningPayload(null);
      } catch (e) {
        expect(e.message).to.equal('signing payload cannot be null');
        thrown = true;
      }

      expect(thrown).to.equal(true);      
    });

    it('should throw the address is empty', async function () {
      let thrown = false;
      let signature = new SigningPayload(null, 'blah');

      try {
        asserter.SigningPayload(signature);
      } catch (e) {
        thrown = true;
        expect(e.message).to.equal('signing payload cannot be empty');
      }

      expect(thrown).to.equal(true);      
    });

    it('should throw the signing bytes are empty', async function () {
      let thrown = false;
      let signature = new SigningPayload('address');

      try {
        asserter.SigningPayload(signature);
      } catch (e) {
        thrown = true;
        expect(e.message).to.equal('signing payload bytes cannot be empty');
      }

      expect(thrown).to.equal(true);      
    });

    it('should throw when the signature type is invalid', async function () {
      let thrown = false;
      let signature = new SigningPayload('addr', 'abcde12345');
      signature.signature_type = 'nope';

      try {
        asserter.SigningPayload(signature);
      } catch (e) {
        thrown = true;
        expect(e.message).to.equal('signature payload type is not valid: "nope" is not a supported SignatureType');
      }

      expect(thrown).to.equal(true);   
    });
  });

  describe('Test Signatures', function () {
    const asserter = new RosettaSDK.Asserter();

    const {
      SigningPayload,
      PublicKey,
      SignatureType,
      CurveType,
      Signature,
      AccountIdentifier,
    } = RosettaSDK.Client; 

    const validPublicKey = new PublicKey('affe', new CurveType().secp256k1);
    const validAccount = new AccountIdentifier('test');

    it('should throw on invalid hex string', async function () {
      let thrown = false;

      const signatures = [
        new Signature(
          SigningPayload.constructFromObject({
            address: validAccount.address,
            hex_bytes: 'affe1',
          }),

          validPublicKey,
          new SignatureType().ed25519,
          'ffff',
        ),      
      ];

      try {
        asserter.Signatures(signatures);
      } catch (e) {
        expect(e.message).to.equal('signature 0 has invalid signing payload: hex_bytes must be a valid hexadecimal string');
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });

    it('should assert a valid signature properly', async function () {
      let thrown = false;

      const signatures = [
        new Signature(
          SigningPayload.constructFromObject({
            address: validAccount.address,
            hex_bytes: 'affe',
          }),

          validPublicKey,
          new SignatureType().ed25519,
          'ffff',
        ),

        new Signature(
          SigningPayload.constructFromObject({
            address: validAccount.address,
            hex_bytes: 'affe',
          }),

          validPublicKey,
          new SignatureType().ed25519,
          'ffee',
        ),        
      ];

      try {
        asserter.Signatures(signatures);
      } catch (e) {
        console.error(e)
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });

    it('should type check the signature properly', async function () {
      let thrown = false;

      const signatures = [
        new Signature(
          SigningPayload.constructFromObject({
            address: validAccount.address,
            hex_bytes: 'affe',
            signature_type: new SignatureType().ed25519,
          }),

          validPublicKey,
          new SignatureType().ed25519,
          'ffff0000',
        )
      ];

      try {
        asserter.Signatures(signatures);
      } catch (e) {
        console.error(e)
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });

    it('should throw when passing null', async function () {
      let thrown = false;

      const signatures = null;

      try {
        asserter.Signatures(signatures);
      } catch (e) {
        expect(e.message).to.equal('signatures cannot be empty');
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });

    it('should throw on empty signatures', async function () {
      let thrown = false;

      const signatures = [
        new Signature(
          SigningPayload.constructFromObject({
            address: validAccount.address,
            hex_bytes: 'affe',
          }),

          validPublicKey,
          new SignatureType().ecdsa_recovery,
          'abcd1234',
        ),

        new Signature(
          SigningPayload.constructFromObject({
            address: validAccount.address,
            hex_bytes: 'affe',
            signature_type: new SignatureType().ed25519,
          }),

          validPublicKey,
          new SignatureType().ed25519,
        ),
      ];

      try {
        asserter.Signatures(signatures);
      } catch (e) {
        expect(e.message).to.equal('signature 1: bytes cannot be empty');
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });

    it('should throw on signature type mismatch', async function () {
      let thrown = false;

      const signatures = [
        new Signature(
          SigningPayload.constructFromObject({
            address: validAccount.address,
            hex_bytes: 'affe',
            signature_type: new SignatureType().ecdsa_recovery,
          }),

          validPublicKey,
          new SignatureType().ed25519,
          'hello',
        )
      ];

      try {
        asserter.Signatures(signatures);
      } catch (e) {
        expect(e.message).to.equal('requested signature type does not match returned signature type');
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });
  });

  // describe('ConstructionSubmitResponse Tests', function () {
  //   const asserter = new RosettaSDK.Asserter();

  //   const {
  //     ConstructionSubmitResponse,
  //     TransactionIdentifier,
  //   } = RosettaSDK.Client;

  //   it('should assert a valid response', async function () {
  //     let thrown = false;

  //     let txId = new TransactionIdentifier('tx1');
  //     let response = new ConstructionSubmitResponse(txId);

  //     try {
  //       asserter.ConstructionSubmitResponse(response);
  //     } catch (e) {
  //       console.error(e);
  //       thrown = true;
  //     }

  //     expect(thrown).to.equal(false);      
  //   });

  //   it('should throw on a null response', async function () {
  //     let thrown = false;

  //     let response = null;

  //     try {
  //       asserter.ConstructionSubmitResponse(response);
  //     } catch (e) {
  //       // console.error(e);
  //       expect(e.name).to.equal('AsserterError');
  //       expect(e.message).to.equal('ConstructionSubmitResponse cannot be null');        
  //       thrown = true;
  //     }

  //     expect(thrown).to.equal(true);      
  //   });   

  //   it('should throw on invalid transaction identifier', async function () {
  //     let thrown = false;

  //     let txId = null;
  //     let response = new ConstructionSubmitResponse(txId);

  //     try {
  //       asserter.ConstructionSubmitResponse(response);
  //     } catch (e) {
  //       // console.error(e);
  //       expect(e.name).to.equal('AsserterError');
  //       expect(e.message).to.equal('TransactionIdentifier is null');        
  //       thrown = true;
  //     }

  //     expect(thrown).to.equal(true);       
  //   });    
  // });

  describe('Network Tests', function () {
    const asserter = new RosettaSDK.Asserter();

    const {
      NetworkIdentifier,
      SubNetworkIdentifier,
    } = RosettaSDK.Client;

    it('should assert a valid network properly', async function () {
      let thrown = false;

      const network = new NetworkIdentifier('bitcoin', 'mainnet');

      try {
        asserter.NetworkIdentifier(network);
      } catch (e) {
        thrown = true;
      }

      expect(thrown).to.equal(false);       
    });

    it('should throw when network is null', async function () {
      let thrown = false;

      const network = null;

      try {
        asserter.NetworkIdentifier(network);
      } catch (e) {
        // console.error(e)
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('NetworkIdentifier is null');
        thrown = true;
      }
      
      expect(thrown).to.equal(true);       
    });   

    it('should throw when asserting an invalid network (blockchain missing)', async function () {
      let thrown = false;

      const network = new NetworkIdentifier('', 'mainnet');

      try {
        asserter.NetworkIdentifier(network);
      } catch (e) {
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('NetworkIdentifier.blockchain is missing');        
        thrown = true;
      }

      expect(thrown).to.equal(true);       
    });

    it('should throw when asserting an invalid network (network missing)', async function () {
      let thrown = false;

      const network = new NetworkIdentifier('bitcoin', '');

      try {
        asserter.NetworkIdentifier(network);
      } catch (e) {
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('NetworkIdentifier.network is missing');        
        thrown = true;
      }

      expect(thrown).to.equal(true);       
    });    

    it('should correctly assert a valid subnetwork', async function () {
      let thrown = false;

      const network = new NetworkIdentifier('bitcoin', 'mainnet');
      network.sub_network_identifier = new SubNetworkIdentifier('shard 1');

      try {
        asserter.NetworkIdentifier(network);
      } catch (e) {
        thrown = true;
      }

      expect(thrown).to.equal(false);       
    });   

    it('should throw when passing an invalid subnetwork', async function () {
      let thrown = false;

      const network = new NetworkIdentifier('bitcoin', 'mainnet');
      network.sub_network_identifier = new SubNetworkIdentifier();

      try {
        asserter.NetworkIdentifier(network);
      } catch (e) {
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('NetworkIdentifier.sub_network_identifier.network is missing');        
        thrown = true;
      }

      expect(thrown).to.equal(true);       
    });    
  });

  describe('Test Version', function () {
    const asserter = new RosettaSDK.Asserter();

    const {
      Version,
    } = RosettaSDK.Client;

    const middlewareVersion = '1.2';
    const invalidMiddlewareVersion = '';
    const validRosettaVersion = '1.4.1';

    it('should assert a valid version correctly', async function () {
      let thrown = false;

      let version = Version.constructFromObject({
        rosetta_version: validRosettaVersion,
        node_version: '1.0',
      });

      try {
        asserter.Version(version);
      } catch(e) {
        console.error(e);
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });

    it('should assert a valid version with middleware correctly', async function () {
      let thrown = false;

      let version = Version.constructFromObject({
        rosetta_version: validRosettaVersion,
        node_version: '1.0',
        middleware_version: middlewareVersion,
      });

      try {
        asserter.Version(version);
      } catch(e) {
        console.error(e);
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });

    it('should throw on too old rosetta version', async function () {
      let thrown = false;

      let version = Version.constructFromObject({
        rosetta_version: '1.2.0',
        node_version: '1.0',
      });

      try {
        asserter.Version(version);
      } catch(e) {
        console.error(e);
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });  

    it('should throw on null version', async function () {
      let thrown = false;

      let version = null;

      try {
        asserter.Version(version);
      } catch(e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Version is null');             
        thrown = true;
      }

      expect(thrown).to.equal(true);
    }); 

    it('should throw on invalid node version', async function () {
      let thrown = false;

      let version = Version.constructFromObject({
        rosetta_version: '1.2.0',
      });

      try {
        asserter.Version(version);
      } catch(e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Version.node_version is missing');             
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });     

    it('should throw on invalid middleware version', async function () {
      let thrown = false;

      let version = Version.constructFromObject({
        rosetta_version: validRosettaVersion,
        node_version: '1.0',
        middleware_version: invalidMiddlewareVersion,
      });

      try {
        asserter.Version(version);
      } catch(e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Version.middleware_version is missing');             
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });      
  });

  describe('Test Allow', function () {
    const asserter = new RosettaSDK.Asserter();

    const {
      OperationStatus,
      Allow,
    } = RosettaSDK.Client;    

    const operationStatuses = [
      new OperationStatus('SUCCESS', true),
      new OperationStatus('FAILURE', false),
    ];  

    const operationTypes = ['PAYMENT'];

    it('should assert a valid allow correctly', async function () {
      let thrown = false;

      let allow = new Allow(operationStatuses, operationTypes);

      try {
        asserter.Allow(allow);

      } catch(e) {
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });

    it('should throw when null is passed', async function () {
      let thrown = false;

      let allow = null;

      try {
        asserter.Allow(allow);

      } catch(e) {
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Allow is null');          
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });    

    it('should throw when no operationStatuses are found', async function () {
      let thrown = false;

      let allow = new Allow(null, operationTypes);

      try {
        asserter.Allow(allow);

      } catch(e) {
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('No Allow.operation_statuses found');          
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });    

    it('should throw when no successful statuses are found', async function () {
      let thrown = false;

      let allow = new Allow([operationStatuses[1]], operationTypes);

      try {
        asserter.Allow(allow);

      } catch(e) {
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('No successful Allow.operation_statuses found');          
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });    
    
    it('should throw when no operation types exist', async function () {
      let thrown = false;

      let allow = new Allow(operationStatuses, null);

      try {
        asserter.Allow(allow);

      } catch(e) {
        // console.error(e)
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('No Allow.operation_statuses found');          
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });        
  });

  describe('Test Error', function () {
    const asserter = new RosettaSDK.Asserter();

    it('should assert a valid error correctly', async function () {
      let thrown = false;

      const error = new RosettaSDK.Client.Error(12, 'signature invalid');

      try {
        asserter.Error(error);
      } catch (e) {
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });

    it('should throw when passing nil', async function () {
      let thrown = false;

      const error = null;

      try {
        asserter.Error(error);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Error is null');       
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });

    it('should throw on negative error codes', async function () {
      let thrown = false;

      const error = new RosettaSDK.Client.Error(-1, 'signature invalid');

      try {
        asserter.Error(error);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Error.code is negative');       
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });

    it('should throw on empty error message', async function () {
      let thrown = false;

      const error = new RosettaSDK.Client.Error(0);

      try {
        asserter.Error(error);
      } catch (e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Error.message is missing');       
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });
  });

  describe('Test Errors', function () {
    const asserter = new RosettaSDK.Asserter();

    it('should assert valid errors correctly', async function () {
      let thrown = false;

      const errors = [
        new RosettaSDK.Client.Error(0, 'error 1'),
        new RosettaSDK.Client.Error(1, 'error 2'),
      ];

      try {
        asserter.Errors(errors);
      } catch (e) {
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });

    it('should throw on duplicate error codes', async function () {
      let thrown = false;

      const errors = [
        new RosettaSDK.Client.Error(0, 'error 1'),
        new RosettaSDK.Client.Error(0, 'error 2'),
      ];

      try {
        asserter.Errors(errors);
      } catch (e) {
        // console.error(e)
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('Error code used multiple times');           
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });    
  });

  describe('Test Valid Network List Response', function () {
    const asserter = new RosettaSDK.Asserter();

    const {
      NetworkIdentifier,
      SubNetworkIdentifier,
      NetworkListResponse,
    } = RosettaSDK.Client;

    const network1 = new NetworkIdentifier('blockchain 1', 'network 1');

    const network1Sub = new NetworkIdentifier('blockchain 1', 'network 1');
    network1Sub.sub_network_identifier = new SubNetworkIdentifier('subnetwork');

    const network2 = new NetworkIdentifier('blockchain 2', 'network 2');

    const network3 = new NetworkIdentifier(null, 'network 2');

    it('should assert a valid network list correctly', async function () {
      let thrown = false;

      const networkListResponse = new NetworkListResponse([
        network1,
        network1Sub,
        network2,
      ]);

      try {
        asserter.NetworkListResponse(networkListResponse);
      } catch(e) {
        console.error(e);
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });

    it('should throw when passing null', async function () {
      let thrown = false;

      const networkListResponse = null;

      try {
        asserter.NetworkListResponse(networkListResponse);
      } catch(e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('NetworkListResponse is null');        
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });

    it('should throw when passing a duplicate network', async function () {
      let thrown = false;

      const networkListResponse = new NetworkListResponse([
        network1Sub,
        network1Sub,
      ]);
      
      try {
        asserter.NetworkListResponse(networkListResponse);
      } catch(e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('NetworkListResponse.Network contains duplicated');        
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });

    it('should throw when passing an invalid network', async function () {
      let thrown = false;

      const networkListResponse = new NetworkListResponse([
        network3,
      ]);
      
      try {
        asserter.NetworkListResponse(networkListResponse);
      } catch(e) {
        // console.error(e);
        expect(e.name).to.equal('AsserterError');
        expect(e.message).to.equal('NetworkIdentifier.blockchain is missing');        
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });            
  });

  describe('Test Block', function () {
    const asserter = new RosettaSDK.Asserter();
    const {
      Amount,
      Currency,
      OperationIdentifier,
      Operation,
      AccountIdentifier,
      NetworkIdentifier,
      BlockIdentifier,
      Block,
      Transaction,
      TransactionIdentifier,
      Peer, 
      NetworkOptionsResponse,
      NetworkStatusResponse,
      Version,
      Allow,
      OperationStatus,
    } = RosettaSDK.Client;      

    const validBlockIdentifier = new BlockIdentifier(100, 'blah');
    const validParentBlockIdentifier = new BlockIdentifier(99, 'blah parent');

    const validAmount = new Amount('1000', new Currency('BTC', 8));
    const validAccount = new AccountIdentifier('test');

    const validTransaction = new Transaction(
      new TransactionIdentifier('blah'),
      [
        Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(0),
          type: 'PAYMENT',
          status: 'SUCCESS',
          account: validAccount,
          amount: validAmount,
        }),

        Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          related_operations: [
            new OperationIdentifier(0),
          ],
          type: 'PAYMENT',
          status: 'SUCCESS',
          account: validAccount,
          amount: validAmount,
        }),
      ],
    );

    const relatedToSelfTransaction = new Transaction(
      new TransactionIdentifier('blah'),
      [
        Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(0),
          related_operations: [
            new OperationIdentifier(0),
          ],      
          type: 'PAYMENT',
          status: 'SUCCESS',
          account: validAccount,
          amount: validAmount,
        }),
      ],
    );

    const outOfOrderTransaction = new Transaction(
      new TransactionIdentifier('blah'),
      [
        Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          related_operations: [
            new OperationIdentifier(0),
          ],      
          type: 'PAYMENT',
          status: 'SUCCESS',
          account: validAccount,
          amount: validAmount,
        }),

        Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(0),
          type: 'PAYMENT',
          status: 'SUCCESS',
          account: validAccount,
          amount: validAmount,
        }),
      ],
    );

    const relatedToLaterTransaction = new Transaction(
      new TransactionIdentifier('blah'),
      [
        Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(0),
          related_operations: [
            new OperationIdentifier(1),
          ],      
          type: 'PAYMENT',
          status: 'SUCCESS',
          account: validAccount,
          amount: validAmount,
        }),

        Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          related_operations: [
            new OperationIdentifier(0),
          ],      
          type: 'PAYMENT',
          status: 'SUCCESS',
          account: validAccount,
          amount: validAmount,
        }),
      ],
    );

    const relatedDuplicateTransaction = new Transaction(
      new TransactionIdentifier('blah'),
      [
        Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(0),
          type: 'PAYMENT',
          status: 'SUCCESS',
          account: validAccount,
          amount: validAmount,
        }),

        Operation.constructFromObject({
          operation_identifier: new OperationIdentifier(1),
          related_operations: [
            new OperationIdentifier(0),
            new OperationIdentifier(0),
          ],      
          type: 'PAYMENT',
          status: 'SUCCESS',
          account: validAccount,
          amount: validAmount,
        }),
      ],
    );    

    const tests = {
      'valid block': {
        block: Block.constructFromObject({
          block_identifier: validBlockIdentifier,
          parent_block_identifier: validParentBlockIdentifier,
          timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
          transactions: [validTransaction],
        }),
        err: null,
      },
      'genesis block': {
        block: Block.constructFromObject({
          block_identifier: validBlockIdentifier,
          parent_block_identifier: validBlockIdentifier,
          transactions: [validTransaction],
        }),
        genesisIndex: validBlockIdentifier.index,
        err: null,
      },
      'out of order transaction operations': {
        block: Block.constructFromObject({
          block_identifier: validBlockIdentifier,
          parent_block_identifier: validParentBlockIdentifier,
          timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
          transactions: [outOfOrderTransaction],
        }),
        err: 'Invalid operation in transaction blah: Operation.identifier is invalid in operation 0: ' +
          'OperationIdentifier.index 1 is out of order, expected 0',
      },
      'related to self transaction operations': {
        block: Block.constructFromObject({
          block_identifier: validBlockIdentifier,
          parent_block_identifier: validParentBlockIdentifier,
          timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
          transactions: [relatedToSelfTransaction],
        }),
        err: 'Invalid operation in transaction blah: Related operation index 0 >= operation index 0',
      },
      'related to later transaction operations': {
        block: Block.constructFromObject({
          block_identifier: validBlockIdentifier,
          parent_block_identifier: validParentBlockIdentifier,
          timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
          transactions: [relatedToLaterTransaction],
        }),
        err: 'Invalid operation in transaction blah: Related operation index 1 >= operation index 0',
      },
      'duplicate related transaction operations': {
        block: Block.constructFromObject({
          block_identifier: validBlockIdentifier,
          parent_block_identifier: validParentBlockIdentifier,
          timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
          transactions: [relatedDuplicateTransaction],
        }),
        err: 'Invalid operation in transaction blah: Found duplicate related operation index 0 for operation index 1',
      },
      'nil block': {
        block: null,
        err: 'Block is null',
      },
      'nil block hash': {
        block: Block.constructFromObject({
          block_identifier: null,
          parent_block_identifier: validParentBlockIdentifier,
          timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
          transactions: [validTransaction],
        }),
        err: 'BlockIdentifier is null',
      },
      'invalid block hash': {
        block: Block.constructFromObject({
          block_identifier: new BlockIdentifier(),
          parent_block_identifier: validParentBlockIdentifier,
          timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
          transactions: [validTransaction],
        }),
        err: 'BlockIdentifier.hash is missing',
      },
      'block previous hash missing': {
        block: Block.constructFromObject({
          block_identifier: validBlockIdentifier,
          parent_block_identifier: new BlockIdentifier(),
          timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
          transactions: [validTransaction],
        }),
        err: 'BlockIdentifier.hash is missing',
      },
      'invalid parent block index': {
        block: Block.constructFromObject({
          block_identifier: validBlockIdentifier,
          parent_block_identifier: new BlockIdentifier(
            validBlockIdentifier.index,
            validParentBlockIdentifier.hash,
          ),
          timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
          transactions: [validTransaction],
        }),
        err: 'BlockIdentifier.index <= ParentBlockIdentifier.index',
      },
      'invalid parent block hash': {
        block: Block.constructFromObject({
          block_identifier: validBlockIdentifier,
          parent_block_identifier: new BlockIdentifier(
            validParentBlockIdentifier.index,
            validBlockIdentifier.hash,
          ),
          timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
          transactions: [validTransaction],
        }),
        err: 'BlockIdentifier.hash == ParentBlockIdentifier.hash',
      },
      'invalid block timestamp less than RosettaSDK.Asserter.MinUnixEpoch': {
        block: Block.constructFromObject({
          block_identifier: validBlockIdentifier,
          parent_block_identifier: validParentBlockIdentifier,
          transactions: [validTransaction],
        }),
        err: 'Timestamp 0 is before 01/01/2000',
      },
      'invalid block timestamp greater than MaxUnixEpoch': {
        block: Block.constructFromObject({
          block_identifier: validBlockIdentifier,
          parent_block_identifier: validParentBlockIdentifier,
          transactions: [validTransaction],
          timestamp: RosettaSDK.Asserter.MaxUnixEpoch + 1,
        }),
        err: 'Timestamp 2209017600001 is after 01/01/2040',
      },
      'invalid block transaction': {
        block: Block.constructFromObject({
          block_identifier: validBlockIdentifier,
          parent_block_identifier: validParentBlockIdentifier,
          timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
          transactions: [
            new Transaction(),
          ],
        }),
        err: 'TransactionIdentifier is null',
      },      
    };

    for (let testName of Object.keys(tests)) {
      const testParams = tests[testName];

      const networkIdentifier = new NetworkIdentifier('hello', 'world');

      const genesisIndex = testParams.genesisIndex != null ? testParams.genesisIndex : 0;

      const networkStatusResponse = NetworkStatusResponse.constructFromObject({
        genesis_block_identifier: new BlockIdentifier(genesisIndex, `block ${genesisIndex}`),
        current_block_identifier: new BlockIdentifier(100, 'block 100'),
        current_block_timestamp: RosettaSDK.Asserter.MinUnixEpoch + 1,
        peers: [ new Peer('peer 1') ],
      });

      const networkOptionsResponse = NetworkOptionsResponse.constructFromObject({
        version: new Version('1.4.1', '1.0'),
        allow: new Allow([
          new OperationStatus('SUCCESS', true),
          new OperationStatus('FAILURE', false),
        ], ['PAYMENT']),
      });

      let asserter;

      try {
        asserter = RosettaSDK.Asserter.NewClientWithResponses(
          networkIdentifier,
          networkStatusResponse,
          networkOptionsResponse,
        );
      } catch (e) {
        console.error(e);
      }

      it(`should pass test case '${testName}'`, async function () {
        expect(asserter).to.not.equal(undefined);

        let thrown = false;

        try {
          asserter.Block(testParams.block);
        } catch (e) {
          // console.error(e);
          expect(e.message).to.equal(testParams.err);
          thrown = true;   
        }

        expect(thrown).to.equal(testParams.err != null);
      });      

    }
  });

  describe('Test Server', function () {
    const {
      NetworkIdentifier,
      AccountBalanceRequest,
      PartialBlockIdentifier,
      TransactionIdentifier,
      AccountIdentifier,
      Currency,
      OperationIdentifier,
      Operation,
      BlockIdentifier,
      BlockTransactionRequest,
      ConstructionMetadataRequest,
      ConstructionSubmitRequest,
      MempoolTransactionRequest,
      BlockRequest,
      MetadataRequest,
      NetworkRequest,
      Amount,

      SigningPayload,
      SignatureType,
      PublicKey,
      CurveType,

      ConstructionDeriveRequest,
      ConstructionPreprocessRequest,
      ConstructionPayloadsRequest,
      ConstructionCombineRequest,
      ConstructionHashRequest,
      ConstructionParseRequest,
    } = RosettaSDK.Client;

    const validNetworkIdentifier = NetworkIdentifier.constructFromObject({
      blockchain: 'Bitcoin',
      network: 'Mainnet',
    });

    const wrongNetworkIdentifier = NetworkIdentifier.constructFromObject({
      blockchain: 'Bitcoin',
      network: 'Testnet',
    });

    const validAccountIdentifier = new AccountIdentifier('acct1');

    const genesisBlockIndex = 0;
    const validBlockIndex = 1000;
    const validPartialBlockIdentifier = PartialBlockIdentifier.constructFromObject({
      index: validBlockIndex,
    });

    const validBlockIdentifier = BlockIdentifier.constructFromObject({
        index: validBlockIndex,
        hash: 'block 1',
      })

    const validTransactionIdentifier = new TransactionIdentifier('tx1');

    const validPublicKey = PublicKey.constructFromObject({
      hex_bytes: 'affe',
      curve_type: new CurveType().secp256k1,
    })

    const validAmount = Amount.constructFromObject({
      value: '1000',
      currency: Currency.constructFromObject({
        symbol: 'BTC',
        decimals: 8,
      }),
    });

    const validAccount = new AccountIdentifier('test');

    const validOps = [
      Operation.constructFromObject({
        operation_identifier: new OperationIdentifier(0),
        type: 'PAYMENT',
        account: validAccount,
        amount: validAmount,
      }),
      Operation.constructFromObject({
        operation_identifier: new OperationIdentifier(1),
        related_operations: [
          new OperationIdentifier(0),
        ],
        type: 'PAYMENT',
        account: validAccount,
        amount: validAmount,
      }),
    ];

    const unsupportedTypeOps = [
      Operation.constructFromObject({
        operation_identifier: new OperationIdentifier(0),
        type: 'STAKE',
        account: validAccount,
        amount: validAmount,
      }),
      Operation.constructFromObject({
        operation_identifier: new OperationIdentifier(1),
        related_operations: [
          new OperationIdentifier(0),
        ],
        type: 'PAYMENT',
        account: validAccount,
        amount: validAmount,
      }),
    ];

    const invalidOps = [
      Operation.constructFromObject({
        operation_identifier: new OperationIdentifier(0),
        type: 'PAYMENT',
        status: 'SUCCESS',
        account: validAccount,
        amount: validAmount,
      }),
      Operation.constructFromObject({
        operation_identifier: new OperationIdentifier(1),
        related_operations: [
          new OperationIdentifier(0),
        ],
        type: 'PAYMENT',
        status: 'SUCCESS',
        account: validAccount,
        amount: validAmount,
      }),
    ];

    
    const validSignatures = [
      {
        signing_payload: SigningPayload.constructFromObject({
          address: validAccount.address,
          hex_bytes: '1234abcd',
        }),
        public_key: validPublicKey,
        signature_type: new SignatureType().ed25519,
        hex_bytes: 'affe',
      },
    ];

    const signatureTypeMismatch = [
      {
        signing_payload: SigningPayload.constructFromObject({
          address: validAccount.address,
          hex_bytes: '1234abcd',
          signature_type: new SignatureType().ecdsa_recovery,
        }),
        public_key: validPublicKey,
        signature_type: new SignatureType().ed25519,
        hex_bytes: 'affe',
      },
    ];

    const signatureTypeMatch = [
      {
        signing_payload: SigningPayload.constructFromObject({
          address: validAccount.address,
          hex_bytes: '1234abcd',
          signature_type: new SignatureType().ed25519,
        }),
        public_key: validPublicKey,
        signature_type: new SignatureType().ed25519,
        hex_bytes: 'affe',
      },
    ];

    const emptySignature = [
      {
        signing_payload: SigningPayload.constructFromObject({
          address: validAccount.address,
          hex_bytes: '1234abcd',
          signature_type: new SignatureType().ed25519,
        }),
        public_key: validPublicKey,
        signature_type: new SignatureType().ed25519,
      },
    ];
        

    const asserter = RosettaSDK.Asserter.NewServer(
      ['PAYMENT'],
      true, // allowHistorical
      [validNetworkIdentifier],
    );

    describe('Test SupportedNetworks', function () {
      it('should assert valid network identifiers correctly', async function () {
        let thrown = false;

        const networks = [
          validNetworkIdentifier,
          wrongNetworkIdentifier,
        ];

        try {
          asserter.SupportedNetworks(networks);
        } catch (e) {
          console.error(e);
          thrown = true; 
        }

        expect(thrown).to.equal(false);
      });

      it('should throw when passing no networks', async function () {
        let thrown = false;

        const networks = [
        ];

        try {
          asserter.SupportedNetworks(networks);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('NetworkIdentifier Array contains no supported networks');
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });

      it('should throw when returning an invalid network', async function () {
        let thrown = false;

        const networks = [
          new NetworkIdentifier('blah'),
        ];

        try {
          asserter.SupportedNetworks(networks);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('NetworkIdentifier.network is missing');          
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });

      it('should throw when returning duplicate networks', async function () {
        let thrown = false;

        const networks = [
          validNetworkIdentifier,
          validNetworkIdentifier,
        ];

        try {
          asserter.SupportedNetworks(networks);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('SupportedNetwork has a duplicate: {"blockchain":"Bitcoin","network":"Mainnet"}');             
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });      
    });

    describe('Test AccountBalanceRequest', function () {
      const createServer = (allowHistorical) => {
        const server = RosettaSDK.Asserter.NewServer(
          ['PAYMENT'],
          allowHistorical,
          [validNetworkIdentifier],
        );

        return server;        
      }

      it('should assert valid balance request correctly', async function () {
        let thrown = false;

        const server = createServer(false);
        const request = new AccountBalanceRequest(validNetworkIdentifier, validAccountIdentifier);

        try {
          server.AccountBalanceRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true; 
        }

        expect(thrown).to.equal(false);
      });   

      it('should throw when requesting account with invalid network', async function () {
        let thrown = false;

        const server = createServer(false);
        const request = new AccountBalanceRequest(wrongNetworkIdentifier, validAccountIdentifier);

        try {
          server.AccountBalanceRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('Network {"blockchain":"Bitcoin","network":"Testnet"} is not supported');
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });   

      it('should throw when passing null as a request', async function () {
        let thrown = false;

        const server = createServer(false);
        const request = null;

        try {
          server.AccountBalanceRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('AccountBalanceRequest is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });     

      it('should throw when passing a request without a network specifier', async function () {
        let thrown = false;

        const server = createServer(false);
        const request = new AccountBalanceRequest(null, validAccountIdentifier);

        try {
          server.AccountBalanceRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('NetworkIdentifier is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });

      it('should throw when passing a request without an account specifier', async function () {
        let thrown = false;

        const server = createServer(false);
        const request = new AccountBalanceRequest(validNetworkIdentifier, null);

        try {
          server.AccountBalanceRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('Account is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });

      it('should handle a valid historical request properly', async function () {
        let thrown = false;

        const server = createServer(true);
        const request = new AccountBalanceRequest(validNetworkIdentifier, validAccountIdentifier);

        try {
          server.AccountBalanceRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true; 
        }

        expect(thrown).to.equal(false);
      });     

      it('should throw when passing an invalid historical request', async function () {
        let thrown = false;

        const server = createServer(true);
        const request = new AccountBalanceRequest(validNetworkIdentifier, validAccountIdentifier);
        request.block_identifier = new PartialBlockIdentifier();

        try {
          server.AccountBalanceRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('Neither PartialBlockIdentifier.hash nor PartialBlockIdentifier.index is set');          
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });   

      it('should throw when historical request is not available', async function () {
        let thrown = false;

        const server = createServer(false);
        const request = new AccountBalanceRequest(validNetworkIdentifier, validAccountIdentifier);
        request.block_identifier = validPartialBlockIdentifier;

        try {
          server.AccountBalanceRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('historical balance loopup is not supported');          
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });       
    });

    describe('Test BlockRequest', function () {
      it('should assert a valid request properly', async function () {
        let thrown = false;

        const request = new BlockRequest(validNetworkIdentifier, validPartialBlockIdentifier);

        try {
          asserter.BlockRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true; 
        }

        expect(thrown).to.equal(false);
      });

      it('should assert a valid request for block 0 properly', async function () {
        let thrown = false;

        const request = new BlockRequest(validNetworkIdentifier, PartialBlockIdentifier.constructFromObject({
          index: genesisBlockIndex,
        }));

        try {
          asserter.BlockRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true; 
        }

        expect(thrown).to.equal(false);
      });

      it('should throw when requesting an invalid network', async function () {
        let thrown = false;

        const request = new BlockRequest(wrongNetworkIdentifier, validPartialBlockIdentifier);

        try {
          asserter.BlockRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('Network {"blockchain":"Bitcoin","network":"Testnet"} is not supported');
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });

      it('should throw when passing null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.BlockRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('BlockRequest is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });

      it('should throw when requesting a block without a network specifier', async function () {
        let thrown = false;

        const request = new BlockRequest();
        request.block_identifier = validPartialBlockIdentifier;

        try {
          asserter.BlockRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('NetworkIdentifier is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });      

      it('should throw when requesting a block without a block identifier', async function () {
        let thrown = false;

        const request = new BlockRequest(validNetworkIdentifier);

        try {
          asserter.BlockRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('PartialBlockIdentifier is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });       

      it('should throw when requesting an invalid partialBlockIdentifier', async function () {
        let thrown = false;

        const request = new BlockRequest(validNetworkIdentifier, new PartialBlockIdentifier());

        try {
          asserter.BlockRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('Neither PartialBlockIdentifier.hash nor PartialBlockIdentifier.index is set');
          thrown = true; 
        }

        expect(thrown).to.equal(true);
      });    
    });

    describe('Test BlockTransactionRequest', function () {
      it('should assert a valid request properly', async function () {
        let thrown = false;

        const request = new BlockTransactionRequest(
          validNetworkIdentifier,
          validBlockIdentifier,
          validTransactionIdentifier
        );

        try {
          asserter.BlockTransactionRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true; 
        }

        expect(thrown).to.equal(false);        
      });

      it('should throw when passing an invalid network', async function () {
        let thrown = false;

        const request = new BlockTransactionRequest(
          wrongNetworkIdentifier,
          validBlockIdentifier,
          validTransactionIdentifier
        );

        try {
          asserter.BlockTransactionRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('Network {"blockchain":"Bitcoin","network":"Testnet"} is not supported');
          thrown = true; 
        }

        expect(thrown).to.equal(true);        
      });

      it('should throw when passing null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.BlockTransactionRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('BlockTransactionRequest is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);        
      });    

      it('should throw when the request is missing a network', async function () {
        let thrown = false;

        const request = new BlockTransactionRequest(
          null,
          validBlockIdentifier,
          validTransactionIdentifier
        );

        try {
          asserter.BlockTransactionRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('NetworkIdentifier is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);        
      });

      it('should throw when the request is missing a block identifier', async function () {
        let thrown = false;

        const request = new BlockTransactionRequest(
          validNetworkIdentifier,
          null,
          validTransactionIdentifier
        );

        try {
          asserter.BlockTransactionRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('BlockIdentifier is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);        
      });    

      it('should throw when the request\'s blockIdentifier is invalid', async function () {
        let thrown = false;

        const request = new BlockTransactionRequest(
          validNetworkIdentifier,
          new BlockIdentifier(),
        );

        try {
          asserter.BlockTransactionRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('BlockIdentifier.hash is missing');
          thrown = true; 
        }

        expect(thrown).to.equal(true);        
      });   
    });

    describe('Test ConstructionMetadataRequest', function () {
      it('should assert a valid request properly', async function () {
        let thrown = false;

        const request = new ConstructionMetadataRequest(
          validNetworkIdentifier,
          {}, // options
        );

        try {
          asserter.ConstructionMetadataRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true; 
        }

        expect(thrown).to.equal(false); 
      });

      it('should throw when a wrong network was specified', async function () {
        let thrown = false;

        const request = new ConstructionMetadataRequest(
          wrongNetworkIdentifier,
          {}, // options
        );

        try {
          asserter.ConstructionMetadataRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('Network {"blockchain":"Bitcoin","network":"Testnet"} is not supported');
          thrown = true; 
        }

        expect(thrown).to.equal(true); 
      });  

      it('should throw when the request is null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.ConstructionMetadataRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('ConstructionMetadataRequest is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true); 
      });        

      it('should throw when the request is missing a network', async function () {
        let thrown = false;

        const request = new ConstructionMetadataRequest(
          null,
          {}, // options
        );

        try {
          asserter.ConstructionMetadataRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('NetworkIdentifier is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true); 
      });    

      it('should throw when the request is missing options', async function () {
        let thrown = false;

        const request = new ConstructionMetadataRequest(
          validNetworkIdentifier,
          null,
        );

        try {
          asserter.ConstructionMetadataRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('ConstructionMetadataRequest.options is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true); 
      });  
    });

    describe('Test ConstructionSubmitRequest', function () {
      it('should assert the request properly', async function () {
        let thrown = false;

        const request = new ConstructionSubmitRequest(
          validNetworkIdentifier,
          'tx',
        );

        try {
          asserter.ConstructionSubmitRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true; 
        }

        expect(thrown).to.equal(false); 
      });  

      it('should throw when the request is missing options', async function () {
        let thrown = false;

        const request = new ConstructionSubmitRequest(
          wrongNetworkIdentifier,
          'tx',
        );

        try {
          asserter.ConstructionSubmitRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('Network {"blockchain":"Bitcoin","network":"Testnet"} is not supported');
          thrown = true; 
        }

        expect(thrown).to.equal(true); 
      });  

      it('should throw the request is null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.ConstructionSubmitRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('ConstructionSubmitRequest.options is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true); 
      });  

      it('should throw when the request has no transaction', async function () {
        let thrown = false;

        const request = new ConstructionSubmitRequest(
        );

        try {
          asserter.ConstructionSubmitRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('NetworkIdentifier is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true); 
      });  
    });

    describe('Test MempoolTransactionRequest', function () {
      it('should assert a valid request properly', async function () {
        let thrown = false;

        const request = new MempoolTransactionRequest(
          validNetworkIdentifier,
          validTransactionIdentifier,
        );

        try {
          asserter.MempoolTransactionRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true; 
        }

        expect(thrown).to.equal(false);         
      });

      it('should throw when the specified network not supported', async function () {
        let thrown = false;

        const request = new MempoolTransactionRequest(
          wrongNetworkIdentifier,
          validTransactionIdentifier,
        );

        try {
          asserter.MempoolTransactionRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('Network {"blockchain":"Bitcoin","network":"Testnet"} is not supported');
          thrown = true; 
        }

        expect(thrown).to.equal(true);         
      });  

      it('should throw then the request is null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.MempoolTransactionRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('MempoolTransactionRequest is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);         
      }); 

      it('should throw then the request is missing a network', async function () {
        let thrown = false;

        const request = new MempoolTransactionRequest(
          null,
          validTransactionIdentifier,
        );;

        try {
          asserter.MempoolTransactionRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('NetworkIdentifier is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);         
      });  

      it('should throw when the TransactionIdentifier is invalid', async function () {
        let thrown = false;

        const request = new MempoolTransactionRequest(
          validNetworkIdentifier,
          new TransactionIdentifier(),
        );

        try {
          asserter.MempoolTransactionRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('TransactionIdentifier.hash is missing');
          thrown = true; 
        }

        expect(thrown).to.equal(true);         
      });    
    });

    describe('Test MetadataRequest', function () {
      it('should assert a valid request properly', async function () {
        let thrown = false;

        const request = new MetadataRequest();

        try {
          asserter.MetadataRequest(request);
        } catch (e) {
          // console.error(e);
          thrown = true; 
        }

        expect(thrown).to.equal(false);   
      });

      it('should throw when the request is null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.MempoolTransactionRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('MempoolTransactionRequest is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);   
      });      
    });

    describe('Test NetworkRequest', function () {
      it('should assert a valid request properly', async function () {
        let thrown = false;

        const request = new NetworkRequest(validNetworkIdentifier);

        try {
          asserter.NetworkRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true; 
        }

        expect(thrown).to.equal(false);   
      });

      it('should throw when the request has a unsupported network identifier', async function () {
        let thrown = false;

        const request = new NetworkRequest(wrongNetworkIdentifier);

        try {
          asserter.NetworkRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('Network {"blockchain":"Bitcoin","network":"Testnet"} is not supported');
          thrown = true; 
        }

        expect(thrown).to.equal(true);   
      });    

      it('should throw when the request is null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.NetworkRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('NetworkRequest is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);   
      });    

      it('should throw when the request is missing a network', async function () {
        let thrown = false;

        const request = new NetworkRequest();

        try {
          asserter.NetworkRequest(request);
        } catch (e) {
          // console.error(e);
          expect(e.name).to.equal('AsserterError');
          expect(e.message).to.equal('NetworkIdentifier is null');
          thrown = true; 
        }

        expect(thrown).to.equal(true);   
      });                  
    });  

    describe('Test ConstructionDeriveRequest', function () { 
      it('should assert a valid request properly', async function () {
        let thrown = false;

        const request = new ConstructionDeriveRequest(
          validNetworkIdentifier,
          validPublicKey,
        );

        try {
          asserter.ConstructionDeriveRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true;
        }

        expect(thrown).to.equal(false);
      });  

      it('should throw when passing a wrong network', async function () {
        let thrown = false;

        const request = new ConstructionDeriveRequest(
          validNetworkIdentifier,
        );

        try {
          asserter.ConstructionDeriveRequest(request);
        }  catch (e) {
          thrown = true;
          expect(e.message).to.equal('public_key cannot be null');
        } 

        expect(thrown).to.equal(true);
      });    

      it('should throw when passing null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.ConstructionDeriveRequest(request);
        } catch (e) {
          expect(e.message).to.equal('ConstructionDeriveRequest cannot be null');
          thrown = true;
        }

        expect(thrown).to.equal(true);
      });  

      it('should throw when passing no public key', async function () {
        let thrown = false;

        const request = new ConstructionDeriveRequest(
          validNetworkIdentifier,
        );

        try {
          asserter.ConstructionDeriveRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('public_key cannot be null');
        }

        expect(thrown).to.equal(true);
      });  

      it('should throw when passing an empty public key', async function () {
        let thrown = false;

        const request = new ConstructionDeriveRequest(
          validNetworkIdentifier,
          new PublicKey(null, new CurveType().secp256k1),
        );

        try {
          asserter.ConstructionDeriveRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('public key bytes cannot be empty');
        }

        expect(thrown).to.equal(true);
      });  
    });  

    describe('Test ConstructionPreprocessRequest', function () { 
      it('should assert a valid request properly', async function () {
        let thrown = false;

        const request = new ConstructionPreprocessRequest(
          validNetworkIdentifier,
          validOps,
        );

        try {
          asserter.ConstructionPreprocessRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true;
        }

        expect(thrown).to.equal(false);
      });  

      it('should throw when passing a wrong network', async function () {
        let thrown = false;

        const request = new ConstructionPreprocessRequest(
          wrongNetworkIdentifier,
        );

        try {
          asserter.ConstructionPreprocessRequest(request);
        }  catch (e) {
          thrown = true;
          expect(e.message).to.equal('Network {"blockchain":"Bitcoin","network":"Testnet"} is not supported');
        } 

        expect(thrown).to.equal(true);
      });    

      it('should throw when passing null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.ConstructionPreprocessRequest(request);
        } catch (e) {
          expect(e.message).to.equal('constructionPreprocessRequest cannot be null');
          thrown = true;
        }

        expect(thrown).to.equal(true);
      });  

      it('should throw when passing null as operations', async function () {
        let thrown = false;

        const request = new ConstructionPreprocessRequest(
          validNetworkIdentifier,
        );

        try {
          asserter.ConstructionPreprocessRequest(request);
        } catch (e) {
          expect(e.message).to.equal('Operations cannot be null');
          thrown = true;
        }

        expect(thrown).to.equal(true);
      });     

      it('should throw when passing empty operations', async function () {
        let thrown = false;

        const request = new ConstructionPreprocessRequest(
          validNetworkIdentifier,
          [],
        );

        try {
          asserter.ConstructionPreprocessRequest(request);
        } catch (e) {
          expect(e.message).to.equal('Operations cannot be empty for construction');
          thrown = true;
        }

        expect(thrown).to.equal(true);
      });      

      it('should throw when passing an unsupported operation type', async function () {
        let thrown = false;

        const request = new ConstructionPreprocessRequest(
          validNetworkIdentifier,
          unsupportedTypeOps,
        );

        try {
          asserter.ConstructionPreprocessRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('Operation.type is invalid in operation 0: Operation.type STAKE is invalid');
        }

        expect(thrown).to.equal(true);
      });  

      it('should throw when passing invalid operations', async function () {
        let thrown = false;

        const request = new ConstructionPreprocessRequest(
          validNetworkIdentifier,
          invalidOps,
        );

        try {
          asserter.ConstructionPreprocessRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('Operation.status must be empty for construction');
        }

        expect(thrown).to.equal(true);
      });       
    });  

    describe('Test ConstructionPayloadsRequest', function () { 
      it('should assert a valid request properly', async function () {
        let thrown = false;

        const request = new ConstructionPayloadsRequest(
          validNetworkIdentifier,
          validOps,
        );

        request.metadata = {'test': 'hello'};

        try {
          asserter.ConstructionPayloadsRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true;
        }

        expect(thrown).to.equal(false);
      });  

      it('should throw when passing a wrong network', async function () {
        let thrown = false;

        const request = new ConstructionPayloadsRequest(
          wrongNetworkIdentifier,
        );

        try {
          asserter.ConstructionPayloadsRequest(request);
        }  catch (e) {
          thrown = true;
          expect(e.message).to.equal('Network {"blockchain":"Bitcoin","network":"Testnet"} is not supported');
        } 

        expect(thrown).to.equal(true);
      });    

      it('should throw when passing null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.ConstructionPayloadsRequest(request);
        } catch (e) {
          expect(e.message).to.equal('constructionPayloadsRequest cannot be null');
          thrown = true;
        }

        expect(thrown).to.equal(true);
      });  

      it('should throw when passing null as operations', async function () {
        let thrown = false;

        const request = new ConstructionPayloadsRequest(
          validNetworkIdentifier,
        );

        try {
          asserter.ConstructionPayloadsRequest(request);
        } catch (e) {
          expect(e.message).to.equal('Operations cannot be null');
          thrown = true;
        }

        expect(thrown).to.equal(true);
      });     

      it('should throw when passing empty operations', async function () {
        let thrown = false;

        const request = new ConstructionPayloadsRequest(
          validNetworkIdentifier,
          [],
        );

        try {
          asserter.ConstructionPayloadsRequest(request);
        } catch (e) {
          expect(e.message).to.equal('Operations cannot be empty for construction');
          thrown = true;
        }

        expect(thrown).to.equal(true);
      });      

      it('should throw when passing an unsupported operation type', async function () {
        let thrown = false;

        const request = new ConstructionPayloadsRequest(
          validNetworkIdentifier,
          unsupportedTypeOps,
        );

        try {
          asserter.ConstructionPayloadsRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('Operation.type is invalid in operation 0: Operation.type STAKE is invalid');
        }

        expect(thrown).to.equal(true);
      });  

      it('should throw when passing invalid operations', async function () {
        let thrown = false;

        const request = new ConstructionPayloadsRequest(
          validNetworkIdentifier,
          invalidOps,
        );

        try {
          asserter.ConstructionPayloadsRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('Operation.status must be empty for construction');
        }

        expect(thrown).to.equal(true);
      });              
    });  

    describe('Test ConstructionCombineRequest', function () { 
      it('should assert a valid request properly', async function () {
        let thrown = false;

        const request = new ConstructionCombineRequest(
          validNetworkIdentifier,
          'blah',
          validSignatures,
        );

        request.metadata = {'test': 'hello'};

        try {
          asserter.ConstructionCombineRequest(request);
        } catch (e) {
          console.error(e);
          thrown = true;
        }

        expect(thrown).to.equal(false);
      });  

      it('should throw when passing a wrong network', async function () {
        let thrown = false;

        const request = new ConstructionCombineRequest(
          wrongNetworkIdentifier,
        );

        try {
          asserter.ConstructionCombineRequest(request);
        }  catch (e) {
          thrown = true;
          expect(e.message).to.equal('Network {"blockchain":"Bitcoin","network":"Testnet"} is not supported');
        } 

        expect(thrown).to.equal(true);
      });    

      it('should throw when passing null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.ConstructionCombineRequest(request);
        } catch (e) {
          expect(e.message).to.equal('constructionCombineRequest cannot be null');
          thrown = true;
        }

        expect(thrown).to.equal(true);
      });  

      it('should throw when passing an unsigned transaction', async function () {
        let thrown = false;

        const request = new ConstructionCombineRequest(
          validNetworkIdentifier,
          null,
          validSignatures,
        );

        try {
          asserter.ConstructionCombineRequest(request);
        } catch (e) {
          expect(e.message).to.equal('unsigned_transaction cannot be empty');
          thrown = true;
        }

        expect(thrown).to.equal(true);
      });     

      it('should throw when passing null as signature', async function () {
        let thrown = false;

        const request = new ConstructionCombineRequest(
          validNetworkIdentifier,
          'blah',
        );

        try {
          asserter.ConstructionCombineRequest(request);
        } catch (e) {
          expect(e.message).to.equal('signatures cannot be empty');
          thrown = true;
        }

        expect(thrown).to.equal(true);
      });      

      it('should throw when passing empty signatures', async function () {
        let thrown = false;

        const request = new ConstructionCombineRequest(
          validNetworkIdentifier,
          'blah',
          [],
        );

        try {
          asserter.ConstructionCombineRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('signatures cannot be empty');
        }

        expect(thrown).to.equal(true);
      });  

      it('should throw when passing mismatched signature type', async function () {
        let thrown = false;

        const request = new ConstructionCombineRequest(
          validNetworkIdentifier,
          'blah',
          signatureTypeMismatch,
        );

        try {
          asserter.ConstructionCombineRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('requested signature type does not match returned signature type');
        }

        expect(thrown).to.equal(true);
      });   

      it('should throw when passing an empty signature', async function () {
        let thrown = false;

        const request = new ConstructionCombineRequest(
          validNetworkIdentifier,
          'blah',
          emptySignature,
        );

        try {
          asserter.ConstructionCombineRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('signature 0: bytes cannot be empty');
        }

        expect(thrown).to.equal(true);
      });     

      it('should throw when passing a matched', async function () {
        let thrown = false;

        const request = new ConstructionCombineRequest(
          validNetworkIdentifier,
          'blah',
          signatureTypeMatch,
        );

        try {
          asserter.ConstructionCombineRequest(request);
        } catch (e) {
          thrown = true;
        }

        expect(thrown).to.equal(false);
      });                     
    });  

    describe('Test ConstructionHashRequest', function () { 
      it('should properly assert a valid request', async function () {
        let thrown = false;

        const request = new ConstructionHashRequest(
          validNetworkIdentifier,
          'blah',
        );

        try {
          asserter.ConstructionHashRequest(request);
        } catch (e) {
          thrown = true;
        }

        expect(thrown).to.equal(false);
      });   

      it('should throw when passing an invalid network', async function () {
        let thrown = false;

        const request = new ConstructionHashRequest(
          wrongNetworkIdentifier,
        );

        try {
          asserter.ConstructionHashRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('Network {"blockchain":"Bitcoin","network":"Testnet"} is not supported');
        }

        expect(thrown).to.equal(true);
      });   

      it('should properly assert a valid request', async function () {
        let thrown = false;

        const request = new ConstructionHashRequest(
          validNetworkIdentifier,
          'blah',
        );

        try {
          asserter.ConstructionHashRequest(request);
        } catch (e) {
          thrown = true;
        }

        expect(thrown).to.equal(false);
      });   

      it('should throw when passing null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.ConstructionHashRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('constructionHashRequest cannot be null');
        }

        expect(thrown).to.equal(true);
      });  

      it('should throw when passing an empty signed transaction', async function () {
        let thrown = false;

        const request = new ConstructionHashRequest(
          validNetworkIdentifier,
        );

        try {
          asserter.ConstructionHashRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('signed_transaction cannot be empty');
        }

        expect(thrown).to.equal(true);
      });   
    });  

    describe('Test ConstructionParseRequest', function () { 
      it('should properly assert a valid request', async function () {
        let thrown = false;

        const request = new ConstructionParseRequest(
          validNetworkIdentifier,
          true,
          'blah',
        );

        try {
          asserter.ConstructionParseRequest(request);
        } catch (e) {
          console.log(e)
          thrown = true;
        }

        expect(thrown).to.equal(false);
      });   

      it('should throw when passing an invalid network', async function () {
        let thrown = false;

        const request = new ConstructionParseRequest(
          wrongNetworkIdentifier,
          true,
        );

        try {
          asserter.ConstructionParseRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('Network {"blockchain":"Bitcoin","network":"Testnet"} is not supported');
        }

        expect(thrown).to.equal(true);
      });   

      it('should throw when passing null', async function () {
        let thrown = false;

        const request = null;

        try {
          asserter.ConstructionParseRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('constructionParseRequest cannot be null');
        }

        expect(thrown).to.equal(true);
      });   

      it('should throw when passing an empty signed transaction', async function () {
        let thrown = false;

        const request = new ConstructionParseRequest(
          validNetworkIdentifier,
          true,
        );

        try {
          asserter.ConstructionParseRequest(request);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('transaction cannot be empty');
        }

        expect(thrown).to.equal(true);
      });     
    });   
  });

  describe('Contains Currency', function () {
    const asserter = new RosettaSDK.Asserter();

    it('should properly check if a currency is contained', async function () {
      const toFind = new T.Currency('BTC', 8);

      const currencies = [
        new T.Currency('BTC', 8),
      ];

      const result = asserter.containsCurrency(currencies, toFind);

      expect(result).to.equal(true);
    });

    it('should handle complex contains', async function () {
      const toFind = T.Currency.constructFromObject({
        symbol: 'BTC',
        decimals: 8,
        metadata: {
          'blah': 'hello',
        },
      });
      
      const currencies = [
        T.Currency.constructFromObject({
          symbol: 'BTC',
          decimals: 8,
          metadata: {
            'blah': 'hello',
          },
        }),
      ];

      const result = asserter.containsCurrency(currencies, toFind);

      expect(result).to.equal(true);
    });    

    it('should handle more complex contains', async function () {
      const toFind = T.Currency.constructFromObject({
        symbol: 'BTC',
        decimals: 8,
        metadata: {
          'blah': 'hello',
          'blah2': 'bye',
        },
      });
      
      const currencies = [
        T.Currency.constructFromObject({
          symbol: 'BTC',
          decimals: 8,
          metadata: {
            'blah': 'hello',
            'blah2': 'bye',
          },
        }),
      ];

      const result = asserter.containsCurrency(currencies, toFind);

      expect(result).to.equal(true);
    });     

    it('should not find a currency in an empty currency array', async function () {
      const toFind = T.Currency.constructFromObject({
        symbol: 'BTC',
        decimals: 8,
      });
      
      const currencies = [];

      const result = asserter.containsCurrency(currencies, toFind);

      expect(result).to.equal(false);
    });     

    it('should not find a currency with a different symbol', async function () {
      const toFind = T.Currency.constructFromObject({
        symbol: 'BTC',
        decimals: 8,
      });
      
      const currencies = [
        T.Currency.constructFromObject({
          symbol: 'ERX',
          decimals: 8,
        }),
      ];

      const result = asserter.containsCurrency(currencies, toFind);

      expect(result).to.equal(false);
    });    

    it('should not find a currency with different decimals', async function () {
      const toFind = T.Currency.constructFromObject({
        symbol: 'BTC',
        decimals: 8,
      });
      
      const currencies = [
        T.Currency.constructFromObject({
          symbol: 'BTC',
          decimals: 6,
        }),
      ];

      const result = asserter.containsCurrency(currencies, toFind);

      expect(result).to.equal(false);
    });     

    it('should not find a currency with different metadata', async function () {
      const toFind = T.Currency.constructFromObject({
        symbol: 'BTC',
        decimals: 8,
        metadata: {
          'blah': 'hello',
        },
      });
      
      const currencies = [
        T.Currency.constructFromObject({
          symbol: 'BTC',
          decimals: 8,
          metadata: {
            'blah': 'bye',
          },
        }),
      ];

      const result = asserter.containsCurrency(currencies, toFind);

      expect(result).to.equal(false);
    });         
  });

  describe('Account Balance', function () {
    const asserter = new RosettaSDK.Asserter();

    const validBlock = T.BlockIdentifier.constructFromObject({
      index: 1000,
      hash: 'jsakdl',
    });

    const invalidBlock = T.BlockIdentifier.constructFromObject({
      index: 1,
      hash: '',
    });

    const invalidIndex = 1001;
    const invalidHash = 'ajsdk';
    const validAmount = T.Amount.constructFromObject({
      value: '100',
      currency: T.Currency.constructFromObject({
        symbol: 'BTC',
        decimals: 8,
      }),
    });

    it('should properly encode a simple balance', () => {
      let thrown = false;
      try {
        const accountBalanceResponse = new T.AccountBalanceResponse(validBlock, [validAmount]);
        asserter.AccountBalanceResponse(null, accountBalanceResponse);
      } catch (e) {
        console.error(e);
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });

    it('should detect an invalid block', () => {
      let thrown = false;
      try {
        const accountBalanceResponse = new T.AccountBalanceResponse(invalidBlock, [validAmount]);
        asserter.AccountBalanceResponse(null, accountBalanceResponse);
      } catch (e) {
        // console.error(e);
        expect(e.message).to.equal('BlockIdentifier.hash is missing');
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });

    it('should detect duplicate currencies', () => {
      let thrown = false;
      try {
        const accountBalanceResponse = new T.AccountBalanceResponse(validBlock, [validAmount, validAmount]);
        asserter.AccountBalanceResponse(null, accountBalanceResponse);
      } catch (e) {
        // console.error(e);
        expect(e.message).to.equal('Currency BTC used in balance multiple times');
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });
    
    it('should assert history request index as valid', () => {
      let thrown = false;
      try {
        const req = T.PartialBlockIdentifier.constructFromObject({
          index: validBlock.index,
        });

        const accountBalanceResponse = new T.AccountBalanceResponse(validBlock, [validAmount]);
        asserter.AccountBalanceResponse(req, accountBalanceResponse);
      } catch (e) {
        console.error(e);
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });

    it('should assert valid history request hash as valid', () => {
      let thrown = false;
      try {
        const req = T.PartialBlockIdentifier.constructFromObject({
          hash: validBlock.hash,
        });
        const accountBalanceResponse = new T.AccountBalanceResponse(validBlock, [validAmount]);
        asserter.AccountBalanceResponse(req, accountBalanceResponse);
      } catch (e) {
        console.error(e);
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });

    it('should assert valid history request as valid', () => {
      let thrown = false;
      try {
        const req = constructPartialBlockIdentifier(validBlock);
        const accountBalanceResponse = new T.AccountBalanceResponse(validBlock, [validAmount]);
        asserter.AccountBalanceResponse(req, accountBalanceResponse);
      } catch (e) {
        console.error(e);
        thrown = true;
      }

      expect(thrown).to.equal(false);
    });    

    it('should assert valid history request index as invalid', () => {
      let thrown = false;
      try {
        const req = T.PartialBlockIdentifier.constructFromObject({
          hash: validBlock.hash,
          index: invalidIndex,
        });
        const accountBalanceResponse = new T.AccountBalanceResponse(validBlock, [validAmount]);
        asserter.AccountBalanceResponse(req, accountBalanceResponse);
      } catch (e) {
        // console.error(e);
        expect(e.message).to.equal('Request Index 1001 does not match Response block index 1000');
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });    

    it('should assert invalid historical request hash as invalid', () => {
      let thrown = false;
      try {
        const req = T.PartialBlockIdentifier.constructFromObject({
          hash: invalidHash,
          index: validBlock.index,
        });
        const accountBalanceResponse = new T.AccountBalanceResponse(validBlock, [validAmount]);
        asserter.AccountBalanceResponse(req, accountBalanceResponse);
      } catch (e) {
        // console.error(e);
        expect(e.message).to.equal('Request BlockHash ajsdk does not match Response block hash jsakdl');
        thrown = true;
      }

      expect(thrown).to.equal(true);
    });     
  });

  describe('Coin Tests', function () {
    const asserter = new RosettaSDK.Asserter();

    const validAmount = T.Amount.constructFromObject({
      value: '100',
      currency: T.Currency.constructFromObject({
        symbol: 'BTC',
        decimals: 8,
      }),
    });

    describe('Test Coin', function () {
      it('should assert a valid coin properly', async () => {
        let thrown = false;
        const coin = new T.Coin(
          new T.CoinIdentifier('coin1'),
          validAmount,
        );

        try {
          asserter.Coin(coin)
        } catch (e) {
          console.error(e)
          thrown = true;
        }

        expect(thrown).to.equal(false);
      });

      it('should throw when Coin is null', async () => {
        let thrown = false;

        try {
          asserter.Coin(null)
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('Coin cannot be null');
        }

        expect(thrown).to.equal(true);
      });    

      it('should throw when coin has an invalid identifier', async () => {
        let thrown = false;
        const coin = new T.Coin(
          new T.CoinIdentifier(''),
          validAmount,
        );

        try {
          asserter.Coin(coin)
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('coin identifier is invalid: coin_identifier cannot be empty');
        }

        expect(thrown).to.equal(true);
      });   

      it('should throw when a coin has an invalid amount', async () => {
        let thrown = false;
        const coin = new T.Coin(
          new T.CoinIdentifier('coin1'),
          new T.Amount('100'),
        );

        try {
          asserter.Coin(coin)
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('coin amount is invalid: Amount.currency is null');
        }

        expect(thrown).to.equal(true);
      });   

      it('should throw when no amount was specified', async () => {
        let thrown = false;
        const coin = new T.Coin(
          new T.CoinIdentifier('coin1'),
          null
        );

        try {
          asserter.Coin(coin)
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('coin amount is invalid: Amount.value is missing');
        }

        expect(thrown).to.equal(true);
      }); 
    });

    describe('Test Coins', function () {
      it('should assert valid coins properly', async () => {
        let thrown = false;

        const coins = [
          new T.Coin(
            new T.CoinIdentifier('coin1'),
            validAmount,
          ),

          new T.Coin(
            new T.CoinIdentifier('coin2'),
            validAmount,
          ),       
        ];

        try {
          asserter.Coins(coins)
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('coin amount is invalid: Amount.value is missing');
        }

        expect(thrown).to.equal(false);
      });

      it('should not throw when passing null', async () => {
        let thrown = false;

        const coins = null;

        try {
          asserter.Coins(coins)
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('coin amount is invalid: Amount.value is missing');
        }

        expect(thrown).to.equal(false);
      });

      it('should throw when passing duplicate coins', async () => {
        let thrown = false;

        const coins = [
          new T.Coin(
            new T.CoinIdentifier('coin1'),
            validAmount,
          ),

          new T.Coin(
            new T.CoinIdentifier('coin1'),
            validAmount,
          ),       
        ];

        try {
          asserter.Coins(coins);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('duplicate coin identifier detected: coin1');
        }

        expect(thrown).to.equal(true);
      });
    });

    describe('Test CoinChange', function () {
      it('should assert a valid change properly', async () => {
        let thrown = false;

        const change = new T.CoinChange(
          new T.CoinIdentifier('coin1'),
          new T.CoinAction().created,
        );

        try {
          asserter.CoinChange(change);
        } catch (e) {
          thrown = true;
        }

        expect(thrown).to.equal(false);        
      });

      it('should throw when passing null', async () => {
        let thrown = false;

        try {
          asserter.CoinChange(null);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('coin change cannot be null');
        }

        expect(thrown).to.equal(true);        
      });

      it('should throw when passing an invalid identifier', async () => {
        let thrown = false;

        const change = new T.CoinChange(
          new T.CoinIdentifier(''),
          new T.CoinAction().created,
        );

        try {
          asserter.CoinChange(change);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('coin identifier is invalid: coin_identifier cannot be empty');
        }

        expect(thrown).to.equal(true);        
      });

      it('should throw when passing an coin action', async () => {
        let thrown = false;

        const change = new T.CoinChange(
          new T.CoinIdentifier('coin1'),
          'hello',
        );

        try {
          asserter.CoinChange(change);
        } catch (e) {
          thrown = true;
          expect(e.message).to.equal('coin action is invalid: "hello" is not a valid coin action');
        }

        expect(thrown).to.equal(true);        
      });
    });
  });
});