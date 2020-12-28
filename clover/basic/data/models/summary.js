const Sequelize = require('sequelize');
const { sequelize } = require('../config/db');

const Summary = sequelize.define('summary', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  price_change_24h: Sequelize.STRING,
  name: Sequelize.STRING,
  price: Sequelize.STRING,
  transactions: Sequelize.STRING,
  market: Sequelize.STRING,
  difficulty: Sequelize.STRING,
  gas_price: Sequelize.STRING
}, {
  freezeTableName: true
});

module.exports = Summary;
