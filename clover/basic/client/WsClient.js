const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9922');

ws.on('open', function open() {
  ws.send('client message');
});

ws.on('message', function incoming(data) {
  console.log('receive server msg', data);
});
