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

/**
 * PromisePool.test.js
 * Author: Yoshi Jaeger
 */

const PromisePool = require('./PromisePool');
const { expect } = require('chai');

const array = [];
const poolSize = 2;

const testFunction = (timeout, text) => {
  return new Promise((fulfill, reject) => {
    setTimeout(() => {
      array.push(text);
      fulfill(text);
    }, timeout);
  });
};

describe('PromisePool', function () {
  it('output should have the correct order', function (done) {
    PromisePool.create(
      poolSize,
      [
        [500, 'first'],
        [500, 'second'],
        [1000, 'fourth'],
        [100,  'third'],
      ],
      testFunction,
      PromisePool.arrayApplier,
    ).then(data => {
      console.log(`All promises finished! Promises: ${data}, Data: ${array}`);

      // Data should be in correct order
      expect(array).to.deep.equal(['first', 'second', 'third', 'fourth']);

      // Promises should return their data in correct order
      expect(data).to.deep.equal(['first', 'second', 'fourth', 'third']);

      // Test finished      
      done();
    });    
  });
});

