const Sequelize = require('sequelize');
const { sequelize } = require('../config/db');

const Status = sequelize.define('status', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  key: Sequelize.STRING,
  value: Sequelize.STRING
}, {
  freezeTableName: true
});

module.exports = Status;
