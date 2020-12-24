const Sequelize = require('sequelize');
const { sequelize } = require('../config/db');

const Status = sequelize.define('status', {
  key: Sequelize.STRING,
  value: Sequelize.STRING
}, {
  freezeTableName: true
});

module.exports = Status;
