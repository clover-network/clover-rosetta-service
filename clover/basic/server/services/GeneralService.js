const { eth_rosetta_service, btc_rosetta_service } = require('../../config/config');
const _ = require('lodash');
const axios = require('axios');

const generalService = async (params, msg) => {
  const payload = params[params.requestParamsKey];
  if (payload.network_identifier && payload.network_identifier.blockchain === 'Ethereum') {
    let result = await axios.post(eth_rosetta_service + msg.url, payload);
    return result.data;
  } else if (payload.network_identifier && payload.network_identifier.blockchain === 'Bitcoin') {
    let result = await axios.post(btc_rosetta_service + msg.url, payload);
    return result.data;
  }
};

module.exports = {
  generalService,
};
