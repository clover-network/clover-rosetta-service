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

const RosettaSDK = require('../../..');

const ServiceHandlers = require('./services');

/* Create a server configuration */
const Server = new RosettaSDK.Server({
  URL_PORT: 8080,
});

/* Data API: Network */
Server.register('/network/list', ServiceHandlers.Network.networkList);
Server.register('/network/options', ServiceHandlers.Network.networkOptions);
Server.register('/network/status', ServiceHandlers.Network.networkStatus);

/* Data API: Block */
Server.register('/block', ServiceHandlers.Block.block);
Server.register('/block/transaction', ServiceHandlers.Block.blockTransaction);

/* Data API: Account */
Server.register('/account/balance', ServiceHandlers.Account.balance);

/* Data API: Mempool */
Server.register('/mempool', ServiceHandlers.Mempool.mempool);
Server.register('/mempool/transaction', ServiceHandlers.Mempool.mempoolTransaction);

/* Construction API */
Server.register('/construction/metadata', ServiceHandlers.Construction.constructionMetadata);
Server.register('/construction/submit', ServiceHandlers.Construction.constructionSubmit);
Server.register('/construction/combine', ServiceHandlers.Construction.constructionCombine);
Server.register('/construction/derive', ServiceHandlers.Construction.constructionDerive);
Server.register('/construction/hash', ServiceHandlers.Construction.constructionHash);
Server.register('/construction/parse', ServiceHandlers.Construction.constructionParse);
Server.register('/construction/payloads', ServiceHandlers.Construction.constructionPayloads);
Server.register('/construction/preprocess', ServiceHandlers.Construction.constructionPreprocess);