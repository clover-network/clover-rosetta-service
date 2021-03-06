const RosettaSDK = require('../../../sdk');
const { rosetta_port } = require('../config/config');
const ServiceHandlers = require('./services');
const schedule = require('node-schedule');
const Status = require('../data/models/status');
const Summary = require('../data/models/summary');
const Block = require('../data/models/block');
const Index = require('../data/models/index');
const Rank = require('../data/models/rank');
const Promise = require('bluebird');


function startRosetta() {
  /* Create a server configuration */
  const Server = new RosettaSDK.Server({
    URL_PORT: rosetta_port,
  });

  /* Data API: Network */
  Server.register('/network/list', ServiceHandlers.GeneralService.generalService);
  Server.register('/network/options', ServiceHandlers.GeneralService.generalService);
  Server.register('/network/status', ServiceHandlers.GeneralService.generalService);
  Server.register('/network/summary', ServiceHandlers.GeneralService.generalService);
  Server.register('/network/tick', ServiceHandlers.GeneralService.generalService);
  Server.register('/network/search', ServiceHandlers.GeneralService.generalService);
  Server.register('/network/rank', ServiceHandlers.GeneralService.generalService);

  /* Data API: Block */
  Server.register('/block', ServiceHandlers.GeneralService.generalService);
  Server.register('/block/transaction', ServiceHandlers.GeneralService.generalService);

  /* Data API: Account */
  Server.register('/account/balance', ServiceHandlers.GeneralService.generalService);

  /* Data API: Mempool */
  Server.register('/mempool', ServiceHandlers.GeneralService.generalService);
  Server.register('/mempool/transaction', ServiceHandlers.GeneralService.generalService);

  /* Construction API */
  Server.register('/construction/metadata', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/submit', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/combine', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/derive', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/hash', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/parse', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/payloads', ServiceHandlers.GeneralService.generalService);
  Server.register('/construction/preprocess', ServiceHandlers.GeneralService.generalService);

  /* other api */
  Server.launch();
}

function startWs() {
  require('../socket/socket').initWsServer();
}

async function startJob() {
  schedule.scheduleJob('30 */2 * * * *', async () => {
    const { run } = require('./jobs/Summary');
    await run();
  });
  const { runBtc } = require('./jobs/BtcNetworkStatus');
  const { runEth } = require('./jobs/EthNetworkStatus');
  const { runDot } = require('./jobs/DotNetworkStatus');
  const { runClv } = require('./jobs/ClvNetworkStatus');
  runBtc();
  runEth();
  runDot();
  runClv();
  const { clvSummary } = require('./jobs/ClvSummary');
  clvSummary();
  const { clvRank } = require('./jobs/ClvRank');
  clvRank();
}

async function initDb() {
  await Status.sync({ force: false });
  await Summary.sync({ force: false });
  await Block.sync({ force: false });
  await Index.sync({ force: false });
  await Rank.sync({ force: true });
  /**return Promise.all([
    Status.create({key: 'current_btc_block', value: '0'}),
    Status.create({key: 'current_eth_block', value: '0'}),
    Status.create({key: 'current_dot_block', value: '0'}),
    Status.create({key: 'current_clv_block', value: '0'}),
    Status.create({key: 'processed_clv_block', value: '0'}),
    Status.create({key: 'clv_tx_count', value: '0'}),
    Status.create({key: 'clv_contract_count', value: '0'}),
    Summary.create({name: 'Bitcoin', price: '26772.43', transactions: '600336533', market: '497064920914', price_change_24h: '-2.78', difficulty: '22117795561453'}),
    Summary.create({name: 'Ethereum', price: '728.46', transactions: '952024646', market: '82835747820', price_change_24h: '12.09', difficulty: '3787986950834474', gas_price: '40'}),
    Summary.create({name: 'Polkadot', price: '8.05', transactions: '496036', market: '4923109321', price_change_24h: '9.91'}),
  ]);**/
}

(async () => {
  startRosetta();
  startWs();
  await initDb();
  await startJob();
})();
