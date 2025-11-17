const pool = require('../config/db');

async function testDatabaseConnection() {
  console.log('🔍 Проверка подключения к базе данных...\n');
  
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Подключение к базе данных успешно!');
    console.log(`   Время сервера: ${result.rows[0].now}\n`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
    console.error('\n💡 Проверьте:');
    console.error('   1. PostgreSQL запущен');
    console.error('   2. База данных booking_db создана');
    console.error('   3. Параметры в config.json корректны');
    return false;
  }
}

async function checkTables() {
  console.log('🔍 Проверка таблиц...\n');
  
  try {
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('events', 'bookings')
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    if (tables.length === 0) {
      console.log('⚠️  Таблицы не найдены. Запустите миграции: npm run migrate\n');
      return false;
    }
    
    console.log('✅ Найдены таблицы:');
    tables.forEach(table => console.log(`   - ${table}`));
    
    if (tables.length < 2) {
      console.log('⚠️  Не все таблицы созданы. Запустите миграции: npm run migrate\n');
      return false;
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при проверке таблиц:', error.message);
    return false;
  }
}

async function createTestEvent() {
  console.log('🔍 Создание тестового события...\n');
  
  try {
    const result = await pool.query(
      `INSERT INTO events (name, total_seats) 
       VALUES ('Тестовое мероприятие', 10) 
       ON CONFLICT DO NOTHING
       RETURNING id, name, total_seats`
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Тестовое событие создано:');
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   Название: ${result.rows[0].name}`);
      console.log(`   Мест: ${result.rows[0].total_seats}\n`);
      return result.rows[0].id;
    } else {
      const existingEvent = await pool.query(
        'SELECT id, name, total_seats FROM events WHERE name = $1 LIMIT 1',
        ['Тестовое мероприятие']
      );
      
      if (existingEvent.rows.length > 0) {
        console.log('ℹ️  Тестовое событие уже существует:');
        console.log(`   ID: ${existingEvent.rows[0].id}`);
        console.log(`   Название: ${existingEvent.rows[0].name}`);
        console.log(`   Мест: ${existingEvent.rows[0].total_seats}\n`);
        return existingEvent.rows[0].id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Ошибка при создании тестового события:', error.message);
    return null;
  }
}

async function showStatistics() {
  console.log('📊 Статистика:\n');
  
  try {
    const eventsCount = await pool.query('SELECT COUNT(*) as count FROM events');
    const bookingsCount = await pool.query('SELECT COUNT(*) as count FROM bookings');
    
    console.log(`   Событий: ${eventsCount.rows[0].count}`);
    console.log(`   Бронирований: ${bookingsCount.rows[0].count}\n`);
    
    const recentBookings = await pool.query(`
      SELECT b.*, e.name as event_name 
      FROM bookings b 
      JOIN events e ON b.event_id = e.id 
      ORDER BY b.created_at DESC 
      LIMIT 5
    `);
    
    if (recentBookings.rows.length > 0) {
      console.log('   Последние бронирования:');
      recentBookings.rows.forEach(booking => {
        console.log(`   - ${booking.event_name} (user: ${booking.user_id})`);
      });
    }
    
    console.log('');
  } catch (error) {
    console.error('❌ Ошибка при получении статистики:', error.message);
  }
}

async function runSetup() {
  console.log('🚀 Запуск проверки и настройки...\n');
  console.log('═'.repeat(50));
  console.log('');
  
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    await pool.end();
    process.exit(1);
  }
  
  const tablesOk = await checkTables();
  if (!tablesOk) {
    await pool.end();
    process.exit(1);
  }
  
  await createTestEvent();
  await showStatistics();
  
  console.log('✅ Все проверки пройдены успешно!\n');
  console.log('💡 Теперь вы можете запустить сервер: npm start\n');
  
  await pool.end();
  process.exit(0);
}

runSetup().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});

