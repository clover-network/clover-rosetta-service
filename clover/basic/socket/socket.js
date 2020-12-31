const { ws_port } = require('../config/config');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: ws_port });

function initWsServer() {
  wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
      console.log('received client: %s, just drop', message);
    });
  });
  console.log(`Ws is listening on port ${ws_port}`);
}

function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

module.exports = {
  initWsServer,
  broadcast,
};
