module.exports = {
  bcypher_token: '679567197e82406fa35c12702b49a5cd',
  infura_token: 'bd6d2612b6c8462a99385dc5c89cfd41',
  clover_url_http: 'https://rpc.clover.finance',
  polkadot_url_ws_origin: 'wss://rpc.polkadot.io',
  polkadot_url_ws: 'ws://121.40.137.1:9944',
  clover_url_ws: 'wss://api.clover.finance',
  rosetta_port: 9911,
  ws_port: 9922,
  eth_rosetta_service: 'http://proxy.ankr.com/rosetta/ethereum/',
  btc_rosetta_service: 'http://proxy.ankr.com/rosetta/bitcoin/',
  dot_gensis: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  clv_gensis: '0x177faa2eb3975cfb29d14ec337b66656ab120cdaa1656ce1d7cb93e68b06049e',
  btc_rpc: {
    host: 'proxy.ankr.com',
    port: 8332,
    username: process.env.rosetta_username,
    password: process.env.rosetta_password
  },
  eth_rpc: 'http://rosetta:rosetta@proxy.ankr.com:9545',
  subscan: {
    block_api: 'https://polkadot.subscan.io/api/scan/block',
    metadata: 'https://polkadot.subscan.io/api/scan/metadata',
    search_api: 'https://polkadot.subscan.io/api/scan/search',
    blocks: 'https://polkadot.subscan.io/api/scan/blocks'
  }
};
