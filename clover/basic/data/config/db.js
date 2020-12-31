const Sequelize = require('sequelize');

const password = process.env.password || 'clover';
const sequelize = new Sequelize('clover', 'root', password, {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 30000
  },
  logging: false,
  timezone: '+08:00'
});

module.exports = {
  sequelize,
};
