const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        total_seats INT NOT NULL
      )
    `);

    
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user_id)
      )
    `);

    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_event_user 
      ON bookings(event_id, user_id)
    `);

    await client.query('COMMIT');
    console.log('Миграции выполнены успешно');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка при выполнении миграций:', error);
    throw error;
  } finally {
    client.release();
  }
}


if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Миграции завершены');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ошибка:', error);
      process.exit(1);
    });
}

module.exports = migrate;

