const RosettaSDK = require('../../../sdk');
const { rosetta_port, ws_port } = require('../config/config');
const ServiceHandlers = require('./services');
const networkIdentifier = require('./network');
const WebSocketServer = require('websocket').server;
const http = require('http');

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
  Server.useAsserter(asserter);

  /* Data API: Network */
  Server.register('/network/list', ServiceHandlers.Network.networkList);
  Server.register('/network/options', ServiceHandlers.Network.networkOptions);
  Server.register('/network/status', ServiceHandlers.Network.networkStatus);

  /* Data API: Block */
  Server.register('/block', ServiceHandlers.Block.block);
  Server.register('/block/transaction', ServiceHandlers.Block.blockTransaction);
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

startRosetta();
startWs();
