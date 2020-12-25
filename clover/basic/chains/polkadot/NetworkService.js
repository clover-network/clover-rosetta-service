const RosettaSDK = require('../../../../sdk');
const Types = RosettaSDK.Client;
const Polkadot = require("@polkadot/api");
const { polkadot_url_ws } = require('../../config/config');
const provider = new Polkadot.WsProvider(polkadot_url_ws);

let Api = undefined;

async function initApi() {
  if (!Api) {
    Api = await Polkadot.ApiPromise.create({
      provider
    });
  }
  return Promise.resolve(Api);
}

const networkStatus = async () => {
  const api = await initApi();
  const block = await api.rpc.chain.getBlock();
  const currentBlockIdentifier = new Types.BlockIdentifier(block.block.header.number.toString(), block.block.header.hash.toHex());
  const currentBlockTimestamp = parseInt(block.block.extrinsics[0].method.args.toString());
  const genesisBlockIdentifier = new Types.BlockIdentifier(0, '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3');
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
