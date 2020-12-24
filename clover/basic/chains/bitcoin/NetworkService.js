const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Client = require('bitcoin-core');
const bcypher = require('blockcypher');
const { bcypher_token } = require('../../config/config');
const moment = require('moment');
const bcapi = new bcypher('btc','main', bcypher_token);

function getChain() {
  return new Promise((resolve, reject) => {
    bcapi.getChain((err, data) => {
      if (err !== null) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

const networkStatus = async () => {
  const chain = await getChain();
  const currentBlockIdentifier = new Types.BlockIdentifier(chain.height, chain.hash);
  const currentBlockTimestamp = moment(chain.time).valueOf();
  const genesisBlockIdentifier = new Types.BlockIdentifier(0, '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f');
  const peers = [
    new Types.Peer(''),
  ];

  return new Types.NetworkStatusResponse(
    currentBlockIdentifier,
    currentBlockTimestamp,
    genesisBlockIdentifier,
    peers,
  );
};

module.exports = {
  networkStatus,
};
