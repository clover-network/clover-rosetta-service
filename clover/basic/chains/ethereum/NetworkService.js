const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Web3 = require("web3");
const { infura_token } = require('../../config/config');
const web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/' + infura_token));

const networkStatus = async (params) => {
  const block = await web3.eth.getBlock('latest');
  const currentBlockIdentifier = new Types.BlockIdentifier(block.number, block.hash);
  const currentBlockTimestamp = block.timestamp;
  const genesisBlockIdentifier = new Types.BlockIdentifier(0, '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3');
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
