const RosettaSDK = require('../../../sdk');
const { rosetta_port, ws_port } = require('../config/config');
const ServiceHandlers = require('./services');
const networkIdentifier = require('./network');
const WebSocketServer = require('websocket').server;
const http = require('http');
const Bree = require('bree');
const Status = require('../data/models/status');

const asserter = RosettaSDK.Asserter.NewServer(
  ['Transfer', 'Reward'],
  false,
  [networkIdentifier],
);

function startRosetta() {
  /* Create a server configuration */
  const Server = new RosettaSDK.Server({
    URL_PORT: rosetta_port,
  });

  // Register global asserter
  // Server.useAsserter(asserter);

  /* Data API: Network */
  Server.register('/network/list', ServiceHandlers.GeneralService.generalService);
  Server.register('/network/options', ServiceHandlers.GeneralService.generalService);
  Server.register('/network/status', ServiceHandlers.GeneralService.generalService);

  /* Data API: Block */
  Server.register('/block', ServiceHandlers.GeneralService.generalService);
  Server.register('/block/transaction', ServiceHandlers.GeneralService.generalService);

  /* Data API: Account */
  Server.register('/account/balance', ServiceHandlers.GeneralService.generalService);

  /* Data API: Mempool */
  Server.register('/mempool', ServiceHandlers.GeneralService.generalService);
  Server.register('/mempool/transaction', ServiceHandlers.GeneralService.generalService);

  /* Construction API */
  Server.register('/construction/metadata', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/submit', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/combine', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/derive', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/hash', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/parse', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/payloads', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/preprocess', ServiceHandlers.GeneralService.generalService);
  Server.launch();
}

function startWs() {
  const server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
  });
  server.listen(ws_port, function() {
    console.log(`Ws is listening on port ${ws_port}`);
  });

  const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: true
  });

  wsServer.on('request', function(request) {
    const connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
      if (message.type === 'utf8') {
        console.log('Received Message: ' + message.utf8Data);
        connection.sendUTF(message.utf8Data);
      }
    });
    connection.on('close', function(reasonCode, description) {
      console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
  });
}

function startJob() {
  const bree = new Bree({
    jobs: [{
      name: 'BtcNetworkStatus',
      interval: '14s'
    }]
  });
  bree.run();
  bree.start();
}

async function initDb() {
  await Status.sync({ force: true });
  return Promise.all([
    Status.create({
      key: 'current_btc_block',
      value: '0'
    }),
    Status.create({
      key: 'current_eth_block',
      value: '0'
    }),
    Status.create({
      key: 'current_dot_block',
      value: '0'
    }),
    Status.create({
      key: 'current_clv_block',
      value: '0'
    }),
  ]);
}

(async () => {
  startRosetta();
  startWs();
  await initDb();
  startJob();
})();
