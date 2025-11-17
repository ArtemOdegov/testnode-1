const { Pool } = require('pg');
const os = require('os');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');

async function checkDatabaseUser() {
  console.log('🔍 Определение пользователя PostgreSQL...\n');
  
  const currentUser = os.userInfo().username;
  console.log(`Текущий системный пользователь: ${currentUser}\n`);
  
  const possibleUsers = [currentUser, 'postgres'];
  
  for (const user of possibleUsers) {
    console.log(`Проверка подключения с пользователем: ${user}...`);
    
    try {
      const testPool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: user,
      });
      
      await testPool.query('SELECT 1');
      await testPool.end();
      
      console.log(`✅ Подключение успешно с пользователем: ${user}\n`);
      
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.database.user !== user) {
        console.log(`💡 Обновляю config.json: user = "${user}"`);
        config.database.user = user;
        config.database.password = '';
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('✅ config.json обновлен\n');
      }
      
      return user;
    } catch (error) {
      console.log(`❌ Ошибка с пользователем ${user}: ${error.message}\n`);
    }
  }
  
  console.log('⚠️  Не удалось подключиться к PostgreSQL');
  console.log('Проверьте, что PostgreSQL запущен и настройте config.json вручную\n');
  return null;
}

checkDatabaseUser()
  .then((user) => {
    if (user) {
      console.log(`✅ Используйте пользователя: ${user}`);
      console.log('Теперь запустите: npm run test:setup\n');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка:', error);
    process.exit(1);
  });

