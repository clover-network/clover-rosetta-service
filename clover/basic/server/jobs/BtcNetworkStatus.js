const { networkStatus } = require('../../chains/bitcoin/NetworkService');

(async () => {
  const status = await networkStatus();
  console.log(status);
})();
