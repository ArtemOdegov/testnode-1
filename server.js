const express = require('express');
const bookingsRouter = require('./routes/bookings');
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = express();
const PORT = config.server?.port || 3000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


app.use('/api/bookings', bookingsRouter);


app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', database: 'disconnected' });
  }
});


app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});


app.use((err, req, res, next) => {
  console.error('Ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});


app.listen(PORT, async () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  
  
  try {
    const migrate = require('./migrations/migrate');
    await migrate();
  } catch (error) {
    console.error('Ошибка при выполнении миграций:', error);
  }
});


process.on('SIGINT', async () => {
  console.log('\nЗавершение работы сервера...');
  await pool.end();
  process.exit(0);
});

