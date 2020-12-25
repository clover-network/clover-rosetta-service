const RosettaSDK = require('../../../sdk');
const { rosetta_port } = require('../config/config');
const ServiceHandlers = require('./services');
const networkIdentifier = require('./network');
const schedule = require('node-schedule');
const Status = require('../data/models/status');

const asserter = RosettaSDK.Asserter.NewServer(
  ['Transfer', 'Reward'],
  false,
  [networkIdentifier],
);

function startRosetta() {
  /* Create a server configuration */
  const Server = new RosettaSDK.Server({
    URL_PORT: rosetta_port,
  });

  // Register global asserter
  // Server.useAsserter(asserter);

  /* Data API: Network */
  Server.register('/network/list', ServiceHandlers.GeneralService.generalService);
  Server.register('/network/options', ServiceHandlers.GeneralService.generalService);
  Server.register('/network/status', ServiceHandlers.GeneralService.generalService);

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
  Server.launch();
}

function startWs() {
  require('../socket/socket').initWsServer();
}

function startJob() {
  const btc = schedule.scheduleJob('*/30 * * * * *', async () => {
    const { run } = require('./jobs/BtcNetworkStatus');
    await run();
  });
  btc.invoke();

  const eth = schedule.scheduleJob('*/10 * * * * *', async () => {
    const { run } = require('./jobs/EthNetworkStatus');
    await run();
  });
  eth.invoke();

  const dot = schedule.scheduleJob('*/6 * * * * *', async () => {
    const { run } = require('./jobs/DotNetworkStatus');
    await run();
  });
  dot.invoke();

  const clv = schedule.scheduleJob('*/6 * * * * *', async () => {
    const { run } = require('./jobs/ClvNetworkStatus');
    await run();
  });
  eth.invoke();
}

async function initDb() {
  await Status.sync({ force: true });
  return Promise.all([
    Status.create({
      key: 'current_btc_block',
      value: '0'
    }),
    Status.create({
      key: 'current_eth_block',
      value: '0'
    }),
    Status.create({
      key: 'current_dot_block',
      value: '0'
    }),
    Status.create({
      key: 'current_clv_block',
      value: '0'
    }),
  ]);
}

(async () => {
  startRosetta();
  startWs();
  await initDb();
  startJob();
})();
