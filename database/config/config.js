require('dotenv').config();

module.exports = {
  development: {
    username: 'YOUR_USERNAME_HERE',
    password: null,
    database: 'YOUR_DB_NAME_HERE',
    host: '127.0.0.1',
    dialect: 'postgres',
    logging: false,
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    // dialectOptions: {
    //   ssl: {
    //     require: true,
    //     rejectUnauthorized: false,
    //   },
    // },
    logging: false,
  },
};
