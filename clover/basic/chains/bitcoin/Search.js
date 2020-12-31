const { btc_rpc: { host, port, username, password} } = require('../../config/config');
const axios = require('axios');

async function doSearch(method, param = []) {
  const time = new Date().getTime();
  const body = {
    jsonrpc: '1.0',
    id: time,
    method: method,
    params: param
  };

  const result = await axios.post(`http://${username}:${password}@${host}:${port}`, body);
  if (result.status === 200) {
    return result.data;
  }
}

async function search(key) {
  let result;
  if (isAddress(key)) {
    result = await doSearch('getreceivedbyaddress', [key, 6]);
  } else if (isBlock(key)) {
    result = await doSearch('getblock', [key]);
  } else {

  }
  console.log(result);
}

// gensis block: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'
// coin base addr: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'

function isAddress(key) {
  return key.length <= 34;
}

function isBlock(key) {
  return key.startsWith('0000000000');
}

search('1BQLNJtMDKmMZ4PyqVFfRuBNvoGhjigBKF');

/**
 block info should return the following:
 {
	"result": {
		"hash": "000000000000000004ec466ce4732fe6f1ed1cddc2ed4b328fff5224276e3f6f",
		"confirmations": 258647,
		"strippedsize": 948994,
		"size": 948994,
		"weight": 3795976,
		"height": 400000,
		"version": 4,
		"versionHex": "00000004",
		"merkleroot": "b0e8f88d4fb7cbc49ab49a3a43c368550e22a8e9e3e04b15e34240306a53aeec",
		"tx": ["a8d0c0184dde994a09ec054286f1ce581bebf46446a512166eae7628734ea0a5", "0de586d0c74780605c36c0f51dcd850d1772f41a92c549e3aa36f9e78e905284", "fc12dfcb4723715a456c6984e298e00c479706067da81be969e8085544b0ba08", "e4f6674c78284d23f02ae8384eb50c7e73289440d6ffff884e9bdba53298a658", "9ddb44ea139253725a1832c5f6cca05edca6318daf26a1f1537b4ef08263ee3b"],
		"time": 1456417484,
		"mediantime": 1456415577,
		"nonce": 657220870,
		"bits": "1806b99f",
		"difficulty": 163491654908.9593,
		"chainwork": "000000000000000000000000000000000000000000122a24b77c62cd76004cde",
		"nTx": 1660,
		"previousblockhash": "0000000000000000030034b661aed920a9bdf6bbfa6d2e7a021f78481882fa39",
		"nextblockhash": "000000000000000005421b1b2ee6d06d037557d7f5ec96852542413cfed40c22"
	},
	"error": null,
	"id": "curltest"
}
 **/
