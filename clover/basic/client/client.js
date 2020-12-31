const WebSocket = require('ws');

const ws = new WebSocket('ws://121.40.137.1:9922');

ws.on('open', function open() {
  ws.send('client message');
});

ws.on('message', function incoming(data) {
  console.log('receive server msg', data);
});
