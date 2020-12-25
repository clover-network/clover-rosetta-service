const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Web3 = require("web3");
const { clover_rpc } = require('../../config/config');
const web3 = new Web3(new Web3.providers.HttpProvider(clover_rpc));

const networkStatus = async () => {
  const block = await web3.eth.getBlock('latest');
  const currentBlockIdentifier = new Types.BlockIdentifier(block.number, block.hash);
  const currentBlockTimestamp = block.timestamp;
  const genesisBlockIdentifier = new Types.BlockIdentifier(0, '0x177faa2eb3975cfb29d14ec337b66656ab120cdaa1656ce1d7cb93e68b06049e');
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
