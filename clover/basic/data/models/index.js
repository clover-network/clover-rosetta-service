const Sequelize = require('sequelize');
const { sequelize } = require('../config/db');

const Index = sequelize.define('index', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: Sequelize.STRING,
  raw: Sequelize.TEXT('long'), // data returned from rosetta
  block_number: Sequelize.INTEGER,
  block_hash: Sequelize.STRING,
  tx_count: Sequelize.INTEGER,
  timestamp: Sequelize.STRING,
  miner: Sequelize.STRING,
  rewords: Sequelize.STRING,
  used: Sequelize.INTEGER,
}, {
  freezeTableName: true
});

module.exports = Index;
