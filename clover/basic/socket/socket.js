const { ws_port } = require('../config/config');
const WebSocket = require('ws');

let wsSender;

function initWsServer() {
  const wss = new WebSocket.Server({ port: ws_port });
  wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
      console.log('received client: %s, just drop', message);
    });
    wsSender = ws;
  });
  console.log(`Ws is listening on port ${ws_port}`);
}

function getSender() {
  return wsSender;
}

module.exports = {
  initWsServer,
  getSender
};
