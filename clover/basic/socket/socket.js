const { ws_port } = require('../config/config');
const WebSocket = require('ws');
const Summary = require('../data/models/summary');

const wss = new WebSocket.Server({ port: ws_port });

function initWsServer() {
  wss.on('connection', function connection(ws) {
    Summary.findAll().then(res => ws.send(JSON.stringify(res)));
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
