const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Web3 = require("web3");
const { clover_url_http, clv_gensis } = require('../../config/config');
const web3 = new Web3(new Web3.providers.HttpProvider(clover_url_http));

const networkStatus = async () => {
  const block = await web3.eth.getBlock('latest');
  const currentBlockIdentifier = new Types.BlockIdentifier(block.number, block.hash);
  const currentBlockTimestamp = block.timestamp;
  const genesisBlockIdentifier = new Types.BlockIdentifier(0, clv_gensis);
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
