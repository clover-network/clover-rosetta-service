const Sequelize = require('sequelize');
const { sequelize } = require('../config/db');

const Rank = sequelize.define('rank', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  address: Sequelize.STRING,
  balance: Sequelize.STRING
}, {
  freezeTableName: true
});

module.exports = Rank;
