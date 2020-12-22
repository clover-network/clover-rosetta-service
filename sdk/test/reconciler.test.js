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

// reconciler.test.js

const { expect } = require('chai');
const RosettaSDK = require('..');

const { Hash } = require('../lib/utils');

const {
  AccountCurrency
} = RosettaSDK.Reconciler;

const {
  AccountIdentifier,
  Currency,
  Amount,
  Block,
  SubAccountIdentifier,
  BlockIdentifier,
} = RosettaSDK.Client;

const templateReconciler = () => {
  return new RosettaSDK.Reconciler();
};

describe('Reconciler Tests', function () {
  describe('Test Reconciler Constructor', function () {
    const accountCurrency = new AccountCurrency(
      new AccountIdentifier('acct 1'),
      new Currency('BTC', 8),
    );

    it('should have default options set', async function () {
      const options = {};
      const reconciler = new RosettaSDK.Reconciler(options);

      expect(reconciler.inactiveQueue).to.deep.equal([]);
      expect(reconciler.seenAccounts).to.deep.equal({});
      expect(reconciler.interestingAccounts).to.deep.equal([]);
      expect(reconciler.lookupBalanceByBlock).to.deep.equal(RosettaSDK.Reconciler.defaults.lookupBalanceByBlock);
      expect(reconciler.changeQueue).to.deep.equal([]);
    });

    it('should have interesting accounts set', async function () {
      const options = {
        interestingAccounts: [accountCurrency],
      };
      const reconciler = new RosettaSDK.Reconciler(options);

      expect(reconciler.inactiveQueue).to.deep.equal([]);
      expect(reconciler.seenAccounts).to.deep.equal({});
      expect(reconciler.interestingAccounts).to.deep.equal([accountCurrency]);
      expect(reconciler.lookupBalanceByBlock).to.deep.equal(RosettaSDK.Reconciler.defaults.lookupBalanceByBlock);
      expect(reconciler.changeQueue).to.deep.equal([]);
    });  

    it('should have seen accounts set', async function () {
      const options = {
        withSeenAccounts: [accountCurrency],
      };
      const reconciler = new RosettaSDK.Reconciler(options);

      expect(reconciler.inactiveQueue).to.deep.equal([{
        entry: accountCurrency,
      }]);

      expect(reconciler.seenAccounts).to.deep.equal({
        [Hash(accountCurrency)]: {},
      });

      expect(reconciler.interestingAccounts).to.deep.equal([]);
      expect(reconciler.lookupBalanceByBlock).to.deep.equal(RosettaSDK.Reconciler.defaults.lookupBalanceByBlock);
      expect(reconciler.changeQueue).to.deep.equal([]);
    });   

    it('should have the correct setting for lookupBalanceByBlock', async function () {
      const options = {
        lookupBalanceByBlock: false,
      };
      const reconciler = new RosettaSDK.Reconciler(options);

      expect(reconciler.inactiveQueue).to.deep.equal([]);
      expect(reconciler.seenAccounts).to.deep.equal({});
      expect(reconciler.interestingAccounts).to.deep.equal([]);
      expect(reconciler.lookupBalanceByBlock).to.deep.equal(false);
      expect(reconciler.changeQueue).to.deep.equal([]);
    });  
  });

  describe('Contains AccountCurrency', function () {
    const currency1 = new Currency('blah', 2);
    const currency2 = new Currency('blah2', 2);

    const accountsArray = [
      new AccountCurrency({ // test using object as args
        accountIdentifier: new AccountIdentifier('test'),
        currency: currency1,
      }),

      new AccountCurrency( // test using params as args
        AccountIdentifier.constructFromObject({
          address: 'cool',
          sub_account: new SubAccountIdentifier('test2'),
        }),
        currency1,
      ),

      new AccountCurrency(
        AccountIdentifier.constructFromObject({
          address: 'cool',
          sub_account: SubAccountIdentifier.constructFromObject({
            address: 'test2',
            metadata: { 'neat': 'stuff' },
          }),
        }),
        currency1,
      ),
    ];

    const accounts = accountsArray.reduce((a, c, i) => {
      a[Hash(c)] = {};
      return a;
    }, {});

    it('should not find a non-existing account', async function () {
      const found = RosettaSDK.Reconciler.ContainsAccountCurrency(accounts, new AccountCurrency(
        new AccountIdentifier('blah'),
        currency1,
      ));

      expect(found).to.equal(false);
    });

    it('should find a basic account', async function () {
      const found = RosettaSDK.Reconciler.ContainsAccountCurrency(accounts, new AccountCurrency(
        new AccountIdentifier('test'),
        currency1,
      ));

      expect(found).to.equal(true);
    });

    it('should not find a basic account with a bad currency', async function () {
      const found = RosettaSDK.Reconciler.ContainsAccountCurrency(accounts, new AccountCurrency(
        new AccountIdentifier('test'),
        currency2,
      ));

      expect(found).to.equal(false);
    });

    it('should find an account with subaccount', async function () {
      const found = RosettaSDK.Reconciler.ContainsAccountCurrency(accounts, new AccountCurrency(
        AccountIdentifier.constructFromObject({
          address: 'cool',
          sub_account: SubAccountIdentifier.constructFromObject({
            address: 'test2',
          }),
        }),
        currency1,
      ));

      expect(found).to.equal(true);
    });

    it('should find an account with subaccount and metadata', async function () {
      const found = RosettaSDK.Reconciler.ContainsAccountCurrency(accounts, new AccountCurrency(
        AccountIdentifier.constructFromObject({
          address: 'cool',
          sub_account: SubAccountIdentifier.constructFromObject({
            address: 'test2',
            metadata: { 'neat': 'stuff' },
          }),
        }),
        currency1,
      ));

      expect(found).to.equal(true);
    });

    it('should not find an account with subaccount and metadata', async function () {
      const found = RosettaSDK.Reconciler.ContainsAccountCurrency(accounts, new AccountCurrency(
        AccountIdentifier.constructFromObject({
          address: 'cool',
          sub_account: SubAccountIdentifier.constructFromObject({
            address: 'test2',
            metadata: { 'neater': 'stuff' },
          }),
        }),
        currency1,
      ));

      expect(found).to.equal(false);
    });    
  });

  describe('Test ExtractAmount', function () {
    const currency1 = new Currency('curr1', 4);
    const currency2 = new Currency('curr2', 7);
    const amount1 = new Amount('100', currency1);
    const amount2 = new Amount('200', currency2);
    const balances = [ amount1, amount2 ];
    const badCurr = new Currency('no curr', 100);

    it('should not be able to extract balance of a bad currency', async function () {
      let thrown = false;

      try {
        RosettaSDK.Reconciler.extractAmount(balances, badCurr);
      } catch (e) {
        expect(e.message).to.equal('Could not extract amount for {"symbol":"no curr","decimals":100}');
        thrown = true;
      } 

      expect(thrown).to.equal(true);
    });

    it('should find a simple account', async function () {
      let thrown = false;

      try {
        const result = RosettaSDK.Reconciler.extractAmount(balances, currency1);
        expect(result).to.deep.equal(amount1);
      } catch (e) {
        console.error(e);
        thrown = true;
      } 

      expect(thrown).to.equal(false);
    });

    it('should find another simple account', async function () {
      let thrown = false;

      try {
        const result = RosettaSDK.Reconciler.extractAmount(balances, currency2);
        expect(result).to.deep.equal(amount2);
      } catch (e) {
        console.error(e);
        thrown = true;
      } 

      expect(thrown).to.equal(false);
    });    
  });

  describe('Test CompareBalance', async function () {
    const account1 = new AccountIdentifier('blah');
    const account2 = AccountIdentifier.constructFromObject({
      address: 'blah',
      sub_account: new SubAccountIdentifier('sub blah'),
    });

    const currency1 = new Currency('curr1', 4);
    const currency2 = new Currency('curr2', 7);

    const amount1 = new Amount('100', currency1);
    const amount2 = new Amount('200', currency2);

    const block0 = new BlockIdentifier(0, 'block0');
    const block1 = new BlockIdentifier(1, 'block1');
    const block2 = new BlockIdentifier(2, 'block2');

    const helper = {
      headBlock: null,
      storedBlocks: {},

      balanceAccount: null,
      balanceAmount: null,
      balanceBlock: null,

      blockExists: function (blockIdentifier) {
        return this.storedBlocks[blockIdentifier.hash] != null;
      },

      currentBlock: function () {
        if (!this.headBlock)
          throw new Error('Head Block is null');

        return this.headBlock;
      },

      accountBalance: function (account, currency, headBlock) {
        if (!this.balanceAccount || Hash(this.balanceAccount) != Hash(account)) {
          throw new Error('Account does not exist');
        }

        return {
          cachedBalance: this.balanceAmount,
          balanceBlock: this.balanceBlock,
        };
      },
    };

    const reconciler = new RosettaSDK.Reconciler({ helper });

    it('should have no headblock set yet', async function () {
      let thrown = false;
      try {
        const { difference, cachedBalance, headIndex } = await reconciler.compareBalance(
          account1,
          currency1,
          amount1.value,
          block1,
        );
      } catch(e) {
        thrown = true;
        expect(e.message).to.equal('Head Block is null');
      }

      expect(thrown).to.equal(true);
    });

    it('should set the head block', function () {
      helper.headBlock = block0;
    });

    it('should throw that live block is ahead of head block', async function () {
      let thrown = false;
      try {
        const { difference, cachedBalance, headIndex } = await reconciler.compareBalance(
          account1,
          currency1,
          amount1.value,
          block1,
        );
      } catch(e) {
        thrown = true;
        // console.error(e);
        expect(e.message).to.equal('Live block 1 > head block 0');
      }

      expect(thrown).to.equal(true);
    });    

    it('should set another head block', function () {
      helper.headBlock = new BlockIdentifier(2, 'hash2');
    });    

    it('should throw that a block is missing', async function () {
      let thrown = false;
      try {
        const { difference, cachedBalance, headIndex } = await reconciler.compareBalance(
          account1,
          currency1,
          amount1.value,
          block1,
        );
      } catch(e) {
        thrown = true;
        // console.error(e);
        expect(e.message).to.equal('Block gone! Block hash = block1');
      }

      expect(thrown).to.equal(true);
    }); 

    it('should reconfigure helper', function () {
      helper.storedBlocks[block0.hash] = new Block(block0, block0);
      helper.storedBlocks[block1.hash] = new Block(block1, block0);
      helper.storedBlocks[block2.hash] = new Block(block2, block1);
      helper.balanceAccount = account1;
      helper.balanceAmount = amount1;
      helper.balanceBlock = block1;
    });   

    it('should throw an error that the account was updated after live block', async function () {
      let thrown = false;
      try {
        const { difference, cachedBalance, headIndex } = await reconciler.compareBalance(
          account1,
          currency1,
          amount1.value,
          block0,
        );
      } catch(e) {
        thrown = true;
        // console.error(e);
        expect(e.message).to.equal('Account updated: {"address":"blah"} updated at blockheight 1');
      }

      expect(thrown).to.equal(true);      
    });

    it('should return the correct account balance', async function () {
      let thrown = false;
      try {
        const { difference, cachedBalance, headIndex } = await reconciler.compareBalance(
          account1,
          currency1,
          amount1.value,
          block1,
        );

        expect(difference).to.equal('0');
        expect(cachedBalance).to.equal(amount1.value);
        expect(headIndex).to.equal(2);
      } catch(e) {
        thrown = true;
        console.error(e);
      }

      expect(thrown).to.equal(false);      
    });    

    it('should return another balance', async function () {
      let thrown = false;
      try {
        const { difference, cachedBalance, headIndex } = await reconciler.compareBalance(
          account1,
          currency1,
          amount2.value,
          block2,
        );

        expect(difference).to.equal('-100');
        expect(cachedBalance).to.equal(amount1.value);
        expect(headIndex).to.equal(2);
      } catch(e) {
        thrown = true;
        console.error(e);
      }

      expect(thrown).to.equal(false);      
    });    

    it('should throw when comparing balance for a non-existing account', async function () {
      let thrown = false;
      try {
        const { difference, cachedBalance, headIndex } = await reconciler.compareBalance(
          account2,
          currency1,
          amount2.value,
          block2,
        );

        expect(difference).to.equal('0');
        expect(cachedBalance).to.equal("");
        expect(headIndex).to.equal(2);
      } catch(e) {
        thrown = true;
        expect(e.message).to.equal('Account does not exist');
      }

      expect(thrown).to.equal(true);      
    }); 
  });
});

