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

// models: index.js

const { InputError } = require('../errors');
const RosettaClient = require('rosetta-node-sdk-client');

function AddValues(a, b) {
  const parsedA = parseInt(a);
  const parsedB = parseInt(b);

  if (isNaN(parsedA)) {
    throw new AsserterError('SupportedNetworks must be an array');
  }

  if (isNaN(parsedB)) {
    throw new AsserterError('SupportedNetworks must be an array');
  }

  return `${parsedA + parsedB}`;
}

function SubtractValues(a, b) {
  const parsedA = parseInt(a);
  const parsedB = parseInt(b);

  if (isNaN(parsedA)) {
    throw new AsserterError('SupportedNetworks must be an array');
  }

  if (isNaN(parsedB)) {
    throw new AsserterError('SupportedNetworks must be an array');
  }

  return `${parsedA - parsedB}`;  
}

function constructPartialBlockIdentifier(blockIdentifier) {
  return RosettaClient.PartialBlockIdentifier.constructFromObject({
    hash: blockIdentifier.hash,
    index: blockIdentifier.index,
  });
}

// http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
Object.defineProperty(String.prototype, 'hashCode', {
  value: function() {
    var hash = 0, i, chr;
    for (i = 0; i < this.length; i++) {
      chr   = this.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
});

function Hash(input) {
  if (typeof input == 'object') {
    let values = [];
    const keys = Object.keys(input).sort();

    for (let key of keys) {
      if (typeof input[key] == 'object') {
        const subHash = Hash(input[key]);
        values.push(`${key}:${subHash}`);
      } else {
        values.push(`${key}:${input[key]}`);
      }
    }

    return values.join('|').hashCode();
  }

  if (typeof input == 'number') {
    return `${input}`;
  }

  if (typeof input == 'string') {
    return input.hashCode();
  }

  throw new Error(`Invalid type ${typeof input} for Hasher`);
}

function AmountValue(amount) {
  if (amount == null) {
    throw new Error(`Amount value cannot be null`);
  }

  if (typeof amount.value !== 'string') {
    throw new Error('Amount must be a string');
  }  

  return parseInt(amount.value);
}

function NegateValue(amount) {
  if (amount == null) {
    throw new Error(`Amount value cannot be null`);
  }

  if (typeof amount !== 'string') {
    throw new Error('Amount must be a string');
  }

  const negated = 0 - parseInt(amount);
  return `${negated}`;
}

module.exports = {
  AddValues,
  SubtractValues,
  constructPartialBlockIdentifier,
  AmountValue,
  NegateValue,
  Hash,
};