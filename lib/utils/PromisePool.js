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
 * PromisePool.js
 * Author: Yoshi Jaeger
 * 
 * Adapted the code from https://github.com/rxaviers/async-pool/blob/master/lib/es7.js
 * to use an applier proxy.
 */

const defaultApplier = (promiseBodyFn, arg) => {
  const r = promiseBodyFn(arg);
  return r;
};

const arrayApplier = (promiseBodyFn, args = []) => {
  const r = promiseBodyFn(...args);
  return r;
};

async function PromisePool(poolLimit = 8, argArray, promiseBodyFn, applierFn = defaultApplier) {
  const ret = [];
  const executing = [];

  for (const item of argArray) {
    const p = Promise.resolve().then(() => applierFn(promiseBodyFn, item));
    ret.push(p);

    const e = p.then(() => executing.splice(executing.indexOf(e), 1));
    executing.push(e);

    if (executing.length >= poolLimit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(ret);
}

module.exports = {
  create: PromisePool,
  defaultApplier: defaultApplier,
  arrayApplier: arrayApplier,
};