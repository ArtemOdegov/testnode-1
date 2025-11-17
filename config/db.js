const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const dbConfig = config.database || {};

const poolConfig = {
  host: dbConfig.host || 'localhost',
  port: dbConfig.port || 5432,
  database: dbConfig.name || 'booking_db',
  user: dbConfig.user || 'postgres',
};

if (dbConfig.password && dbConfig.password !== '') {
  poolConfig.password = dbConfig.password;
}

const pool = new Pool(poolConfig);


pool.on('connect', () => {
  console.log('Подключение к базе данных установлено');
});

pool.on('error', (err) => {
  console.error('Ошибка подключения к базе данных:', err);
});

module.exports = pool;

